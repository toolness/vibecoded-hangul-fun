import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { DB_JSON_ASSET, getAssetUrl } from "./assets.ts";
import { validateMode } from "./quizStateReducer.ts";
import type { Database } from "./database-spec.ts";
import type { AppCard, FillInTheBlankItem } from "./AppCard.ts";
import { sortByDateAndName } from "./util.ts";
import { DatabaseHelper } from "./database-helper.ts";

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

function createInitialRows(database: Database): AppCard[] {
  const result: AppCard[] = [];
  const dbHelper = new DatabaseHelper(database);

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
      if (!item.wordId || item.doNotQuiz) {
        continue;
      }
      const word = dbHelper.wordIdMap.get(item.wordId);
      if (!word) {
        continue;
      }
      const fillInTheBlankItems: FillInTheBlankItem[] =
        sentence.markupItems.map((otherItem) => {
          if (otherItem === item) {
            const blankValue = otherItem.text
              .split("")
              .map((char) => (char !== " " ? "_" : char))
              .join("");
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
        name,
        picture: word.picture,
        hangul: item.text,
        fillInTheBlankItems: fillInTheBlankItems,
        isTranslation: true,
        audio: sentence.audio,
        category: "Sentence",
        extraWords: dbHelper
          .getSentenceWords(sentence)
          .filter((extraWord) => extraWord !== word),
      });
      itemId += 1;
    }
  }

  sortByDateAndName(result);

  return result;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App
      initialMode={initialMode}
      initialRows={createInitialRows(databaseJson)}
      initialQuestionId={initialId}
    />
  </StrictMode>,
);

const buildDate = new Date(__BUILD_DATE__);
console.log(`App built on: ${buildDate.toLocaleString()}`);
