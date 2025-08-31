import { type DatabaseRow } from "./src/database-spec.ts";
import { DB_JSON_ASSET, getAssetFilePath } from "./src/assets.ts";

import dotenv from "dotenv";
import { readFileSync } from "fs";
import { stringify } from "csv-stringify/sync";

dotenv.config();

const NOTE_TYPE = `Atul's Picture Words`;
const DECK_NAME = `Atul's Korean Words`;

type CsvRow = {
  id: string;
  noteType: string;
  deckName: string;
  tags: string[];
  hangul: string;
  picture: string;
  notes: string;
  audio: string;
};

const PREAMBLE = `\
#separator:comma
#html:true
#notetype column:2
#deck column:3
#tags column:4`;

const run = async () => {
  console.log("Root Anki dir is:", getRootAnkiDir());
  const dbRows = loadDatabase();
  const csvRows: CsvRow[] = [];

  for (const row of dbRows) {
    if (row.audio && row.picture?.type === "local-image" && row.hangul) {
      csvRows.push({
        id: row.id,
        noteType: NOTE_TYPE,
        deckName: DECK_NAME,
        tags: row.category ? [row.category] : [],
        hangul: row.hangul,
        picture: row.picture.filename,
        notes: row.notes ?? "",
        audio: row.audio,
      });
    }
  }

  const encodedRows = stringify(
    csvRows.map((row) => [
      row.id,
      escapeHTML(row.noteType),
      escapeHTML(row.deckName),
      row.tags.map((tag) => escapeHTML(convertToTag(tag))).join(" "),
      escapeHTML(row.hangul),
      `<img src="${escapeHTML(row.picture)}">`,
      escapeHTML(row.notes),
      `[sound:${escapeHTML(row.audio)}]`,
    ]),
  );

  const csv = [PREAMBLE, encodedRows].join("\n");
  console.log(csv);
};

// https://stackoverflow.com/a/57448862
// https://docs.ankiweb.net/importing/text-files.html#html
const escapeHTML = (str) =>
  str.replace(
    /[&<>]/g,
    (tag) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
      })[tag],
  );

function convertToTag(value: string) {
  return value.replace(/ /g, "::");
}

function loadDatabase(): DatabaseRow[] {
  const data = readFileSync(getAssetFilePath(DB_JSON_ASSET), "utf-8");
  return JSON.parse(data) as DatabaseRow[];
}

function getRootAnkiDir(): string {
  // https://docs.ankiweb.net/files.html
  // Implemented by GitHub Copilot.
  const platform = process.platform;
  if (platform === "darwin") {
    // macOS
    return `${process.env.HOME}/Library/Application Support/Anki2`;
  } else if (platform === "win32") {
    // Windows
    return `${process.env.APPDATA}\\Anki2`;
  } else {
    throw new Error("Unsupported OS for Anki directory");
  }
}

await run();
