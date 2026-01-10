import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./components/App.tsx";
import { DB_JSON_ASSET, getAssetUrl } from "./assets.ts";
import { validateMode } from "./quizStateReducer.ts";
import type { Database } from "./database-spec.ts";
import type { AppCard, FillInTheBlankItem } from "./AppCard.ts";
import { convertWordsToUnderscores } from "./util.ts";
import { DatabaseHelper } from "./database-helper.ts";
import { getQuizableItemGroups } from "./sentence-utils.ts";
import { RestaurantOrderingDynamicCard } from "./dynamic-cards/restaurantOrdering.ts";
import { SinoKoreanNumberDynamicCard } from "./dynamic-cards/sinoKoreanNumber.ts";
import { DynamicCardManager } from "./DynamicCard.ts";
import {
  TellingTimeAudioOnlyDynamicCard,
  TellingTimeDynamicCard,
} from "./dynamic-cards/tellingTime.ts";
import { createAiGeneratedFillInTheBlankDynamicCardFactory } from "./dynamic-cards/aiGeneratedFillInTheBlank.ts";
import { createAiGeneratedFullSentenceDynamicCardFactory } from "./dynamic-cards/aiGeneratedFullSentence.ts";

const DATABASE_JSON_URL = getAssetUrl(DB_JSON_ASSET);

const databaseJson: Database = await (await fetch(DATABASE_JSON_URL)).json();

const params = new URLSearchParams(window.location.search);

const initialId = params.get("iid") ?? undefined;

const initialMode = validateMode(params.get("imode") ?? "") ?? "picture";

window.history.replaceState(
  null,
  "",
  `${window.location.origin}${window.location.pathname}`,
);

async function createInitialRows(database: Database): Promise<{
  cards: AppCard[];
  dbHelper: DatabaseHelper;
  dynamicCardManager: DynamicCardManager;
}> {
  const result: AppCard[] = [];
  const dbHelper = new DatabaseHelper(database);
  const dynamicCardManager = new DynamicCardManager([
    RestaurantOrderingDynamicCard,
    SinoKoreanNumberDynamicCard,
    TellingTimeDynamicCard,
    TellingTimeAudioOnlyDynamicCard,
    await createAiGeneratedFillInTheBlankDynamicCardFactory(),
    await createAiGeneratedFullSentenceDynamicCardFactory(),
  ]);

  for (const word of database.words) {
    result.push({
      ...word,
      notionId: word.id,
    });
  }

  for (const sentence of database.sentences) {
    if (!sentence.markupItems) {
      continue;
    }
    const groups = getQuizableItemGroups(sentence.markupItems);
    let groupIndex = 0;
    for (const group of groups) {
      const blankIndices = new Set(group.indices);
      const word = group.wordId
        ? dbHelper.wordIdMap.get(group.wordId)
        : undefined;
      const fillInTheBlankItems: FillInTheBlankItem[] =
        sentence.markupItems.map((markupItem, index) => {
          if (blankIndices.has(index)) {
            const blankValue = convertWordsToUnderscores(markupItem.text);
            return {
              type: "fill-in",
              blankValue,
              answer: markupItem.text,
            };
          } else {
            return { type: "content", value: markupItem.text };
          }
        });
      const name = fillInTheBlankItems
        .map((item) => {
          if (item.type === "content") {
            return item.value;
          }
          return `[${item.answer}]`;
        })
        .join("");
      result.push({
        id: `${sentence.id}_g${groupIndex}`,
        notionId: sentence.id,
        createdTime: sentence.createdTime,
        lastModifiedTime: sentence.lastModifiedTime,
        name,
        picture: word?.picture,
        hangul: group.text,
        fullHangul: sentence.text,
        fillInTheBlankItems: fillInTheBlankItems,
        isTranslation: true,
        audio: sentence.audio,
        category: "Sentence",
        notes: sentence.notes,
        lastIncorrect: sentence.lastIncorrect,
        extraWords: dbHelper
          .getSentenceWords(sentence)
          .filter((extraWord) => extraWord !== word),
      });
      groupIndex += 1;
    }
  }

  result.push(
    ...dynamicCardManager.createAll({
      dbHelper,
      difficulty: "medium",
    }),
  );

  return { cards: result, dbHelper, dynamicCardManager };
}

const {
  cards: initialRows,
  dbHelper,
  dynamicCardManager,
} = await createInitialRows(databaseJson);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App
      initialMode={initialMode}
      initialRows={initialRows}
      initialQuestionId={initialId}
      dbHelper={dbHelper}
      dynamicCardManager={dynamicCardManager}
    />
  </StrictMode>,
);

const buildDate = new Date(__BUILD_DATE__);
console.log(`App built on: ${buildDate.toLocaleString()}`);
