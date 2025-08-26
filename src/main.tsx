import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { getAssetUrl } from "./assets.ts";

const DATABASE_JSON_URL = getAssetUrl("database.json");

const databaseJson = await (await fetch(DATABASE_JSON_URL)).json();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App initialMode="picture" initialRows={databaseJson} />
  </StrictMode>,
);

const buildDate = new Date(__BUILD_DATE__);
console.log(`App built on: ${buildDate.toLocaleString()}`);
