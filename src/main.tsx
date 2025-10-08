import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { DB_JSON_ASSET, getAssetUrl } from "./assets.ts";
import { validateMode } from "./quizStateReducer.ts";
import type { Database } from "./database-spec.ts";
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

  for (const sentence of database.sentences) {
    // TODO: Make a separate app card for each markup item
    // in sentence that we'd make a cloze tag for in Anki.
    result.push({
      id: sentence.id,
      createdTime: sentence.createdTime,
      name: sentence.text,
      hangul: sentence.text,
      isTranslation: true,
      audio: sentence.audio,
      category: "Sentence",
    });
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
