import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { DB_JSON_ASSET, getAssetUrl } from "./assets.ts";
import { validateMode } from "./quizStateReducer.ts";

const DATABASE_JSON_URL = getAssetUrl(DB_JSON_ASSET);

const databaseJson = await (await fetch(DATABASE_JSON_URL)).json();

const params = new URLSearchParams(window.location.search);

const initialId = params.get("iid") ?? undefined;

const initialMode = validateMode(params.get("imode") ?? "") ?? "picture";

window.history.replaceState(
  null,
  "",
  `${window.location.origin}${window.location.pathname}`,
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App
      initialMode={initialMode}
      initialRows={databaseJson}
      initialQuestionId={initialId}
    />
  </StrictMode>,
);

const buildDate = new Date(__BUILD_DATE__);
console.log(`App built on: ${buildDate.toLocaleString()}`);
