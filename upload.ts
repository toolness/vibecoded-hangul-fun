import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import {
  getRootAnkiDir,
  getRecentlyIncorrectCardsSync,
} from "./src/cli/anki-query.ts";
import { getHangulNotionDbConfig } from "./src/cli/notion-db.ts";
import { parseArgs, type ParseArgsOptionsConfig } from "util";
import path from "path";
import Database from "better-sqlite3";
import {
  type Database as JsonDatabase,
  DATABASE_SCHEMA_VERSION,
} from "./src/database-spec.ts";
import { DB_JSON_ASSET, getAssetFilePath } from "./src/assets.ts";
import { existsSync, readFileSync } from "fs";
import Queue from "queue";

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
  /**
   * The Anki note type containing Hangul sentences ultimately derived from
   * the Notion DB.
   */
  sentenceNoteType: {
    type: "string",
    default: `Atul's Cloze Sentences`,
  },
} satisfies ParseArgsOptionsConfig;

async function main() {
  const {
    values: { ankiUser, wordNoteType, sentenceNoteType },
  } = parseArgs({
    options: CLI_ARGS,
  });
  const config = getHangulNotionDbConfig(process.env);
  const client = new Client({ auth: config.apiKey });
  const dbPath = path.join(getRootAnkiDir(), ankiUser, "collection.anki2");

  // Query for recently incorrect word cards
  const wordDb = new Database(dbPath, { readonly: true });
  const wordRows = getRecentlyIncorrectCardsSync({
    noteTypes: [wordNoteType],
    maxAgeInDays: MAX_AGE_IN_DAYS,
    db: wordDb,
  });
  const wordDateMap: Map<string, string> = new Map();
  for (const row of wordRows) {
    const dateString = new Date(row.lastIncorrectTimestamp)
      .toISOString()
      .slice(0, 10);
    wordDateMap.set(row.id, dateString);
  }

  // Query for recently incorrect sentence cards
  const sentenceDb = new Database(dbPath, { readonly: true });
  const sentenceRows = getRecentlyIncorrectCardsSync({
    noteTypes: [sentenceNoteType],
    maxAgeInDays: MAX_AGE_IN_DAYS,
    db: sentenceDb,
  });
  const sentenceDateMap: Map<string, string> = new Map();
  for (const row of sentenceRows) {
    const dateString = new Date(row.lastIncorrectTimestamp)
      .toISOString()
      .slice(0, 10);
    sentenceDateMap.set(row.id, dateString);
  }

  const jsonDatabase = getJsonDatabase();
  const uploadQueue = new Queue({ concurrency: 5, autostart: false });

  // Queue word updates
  for (const word of jsonDatabase.words) {
    const date = wordDateMap.get(word.id);
    if (date && word.lastIncorrect !== date) {
      uploadQueue.push(async () => {
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
      });
    }
  }

  // Queue sentence updates
  for (const sentence of jsonDatabase.sentences) {
    const date = sentenceDateMap.get(sentence.id);
    if (date && sentence.lastIncorrect !== date) {
      uploadQueue.push(async () => {
        const response = await client.pages.update({
          page_id: sentence.id,
          properties: {
            "Last incorrect": {
              date: {
                start: date,
              },
            },
          },
        });
        console.log(
          `Updated sentence ${response.id} with last incorrect date ${date}.`,
        );
      });
    }
  }

  // Start processing and wait for all uploads to complete.
  if (uploadQueue.length > 0) {
    await uploadQueue.start();
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
