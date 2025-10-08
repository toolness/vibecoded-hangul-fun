import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { DB_JSON_ASSET, getAssetUrl } from "./assets.ts";
import { validateMode } from "./quizStateReducer.ts";
import type { Database, WordDatabaseRow } from "./database-spec.ts";
import type { AppCard } from "./AppCard.ts";
import { sortByDateAndName } from "./util.ts";

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
  const result: AppCard[] = [...database.words];
  const wordIdMap: Map<string, WordDatabaseRow> = new Map();

  for (const row of database.words) {
    wordIdMap.set(row.id, row);
  }

  for (const sentence of database.sentences) {
    if (!sentence.markupItems) {
      continue;
    }
    for (const item of sentence.markupItems) {
      if (!item.wordId || item.doNotQuiz) {
        continue;
      }
      const word = wordIdMap.get(item.wordId);
      if (!word) {
        continue;
      }
      const fillInTheBlankText = sentence.markupItems
        .map((otherItem) => {
          if (otherItem === item) {
            return otherItem.text
              .split("")
              .map((char) => (char !== " " ? "_" : char))
              .join("");
          } else {
            return otherItem.text;
          }
        })
        .join("");
      result.push({
        id: sentence.id,
        createdTime: sentence.createdTime,
        name: fillInTheBlankText,
        picture: word.picture,
        hangul: item.text,
        fillInTheBlankText,
        isTranslation: true,
        audio: sentence.audio,
        category: "Sentence",
      });
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
