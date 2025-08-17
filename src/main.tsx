import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import databaseRows from "./database.json";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App initialMode="picture" initialRows={databaseRows} />
  </StrictMode>,
);
