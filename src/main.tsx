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
    let itemId = 0;
    for (const item of sentence.markupItems) {
      if ((!item.wordId && !item.forceQuiz) || item.doNotQuiz) {
        continue;
      }
      const word = item.wordId
        ? dbHelper.wordIdMap.get(item.wordId)
        : undefined;
      const fillInTheBlankItems: FillInTheBlankItem[] =
        sentence.markupItems.map((otherItem) => {
          if (otherItem === item) {
            const blankValue = convertWordsToUnderscores(otherItem.text);
            return {
              type: "fill-in",
              blankValue,
              answer: otherItem.text,
            };
          } else {
            return { type: "content", value: otherItem.text };
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
        id: `${sentence.id}_${itemId}`,
        notionId: sentence.id,
        createdTime: sentence.createdTime,
        lastModifiedTime: sentence.lastModifiedTime,
        name,
        picture: word?.picture,
        hangul: item.text,
        fullHangul: sentence.text,
        fillInTheBlankItems: fillInTheBlankItems,
        isTranslation: true,
        audio: sentence.audio,
        category: "Sentence",
        notes: sentence.notes,
        extraWords: dbHelper
          .getSentenceWords(sentence)
          .filter((extraWord) => extraWord !== word),
      });
      itemId += 1;
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
