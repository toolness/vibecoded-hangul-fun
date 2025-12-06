import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import {
  getRootAnkiDir,
  getRecentlyIncorrectCardsSync,
} from "./src/anki-query.ts";
import { getHangulNotionDbConfig } from "./src/notion-db.ts";
import { parseArgs, type ParseArgsOptionsConfig } from "util";
import path from "path";
import Database from "better-sqlite3";
import {
  type Database as JsonDatabase,
  DATABASE_SCHEMA_VERSION,
} from "./src/database-spec.ts";
import { DB_JSON_ASSET, getAssetFilePath } from "./src/assets.ts";
import { existsSync, readFileSync } from "fs";

dotenv.config();

/**
 * How many days we'll go back in Anki history to populate the
 * "Last incorrect" field in Notion.
 */
const MAX_AGE_IN_DAYS = 14;

const CLI_ARGS = {
  /** The Anki user (used to find Anki directory to put static assets). */
  ankiUser: {
    type: "string",
    default: `User 1`,
  },
  /**
   * The Anki note type containing Hangul words ultimately derived from
   * the Notion DB.
   */
  wordNoteType: {
    type: "string",
    default: `Atul's Picture Words`,
  },
} satisfies ParseArgsOptionsConfig;

async function main() {
  const {
    values: { ankiUser, wordNoteType },
  } = parseArgs({
    options: CLI_ARGS,
  });
  const config = getHangulNotionDbConfig(process.env);
  const client = new Client({ auth: config.apiKey });
  const dbPath = path.join(getRootAnkiDir(), ankiUser, "collection.anki2");
  const db = new Database(dbPath, { readonly: true });
  const rows = getRecentlyIncorrectCardsSync({
    noteTypes: [wordNoteType],
    maxAgeInDays: MAX_AGE_IN_DAYS,
    db,
  });
  const rowDateMap: Map<string, string> = new Map();
  for (const row of rows) {
    const dateString = new Date(row.lastIncorrectTimestamp)
      .toISOString()
      .slice(0, 10);
    rowDateMap.set(row.id, dateString);
  }
  const jsonDatabase = getJsonDatabase();
  for (const word of jsonDatabase.words) {
    const date = rowDateMap.get(word.id);
    if (date && word.lastIncorrect !== date) {
      const response = await client.pages.update({
        page_id: word.id,
        properties: {
          "Last incorrect": {
            date: {
              start: date,
            },
          },
        },
      });
      console.log(
        `Updated word ${response.id} with last incorrect date ${date}.`,
      );
    }
  }

  console.log("Done.");
}

function getJsonDatabase(): JsonDatabase {
  const dbJsonPath = getAssetFilePath(DB_JSON_ASSET);
  if (!existsSync(dbJsonPath)) {
    throw new Error(`JSON database does not exist! Run 'npm download'.`);
  }
  const jsonDatabase = JSON.parse(
    readFileSync(dbJsonPath, { encoding: "utf-8" }),
  ) as JsonDatabase;
  if (jsonDatabase.__schemaVersion !== DATABASE_SCHEMA_VERSION) {
    throw new Error(
      `Invalid JSON database schema version! Run 'npm download'.`,
    );
  }
  return jsonDatabase;
}

main();
