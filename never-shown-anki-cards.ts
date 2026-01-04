import {
  getRootAnkiDir,
  getNeverShownCardsSync,
} from "./src/cli/anki-query.ts";
import { parseArgs, type ParseArgsOptionsConfig } from "util";
import path from "path";
import Database from "better-sqlite3";

const CLI_ARGS = {
  /** The Anki user (used to find Anki directory). */
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

function main() {
  const {
    values: { ankiUser, wordNoteType },
  } = parseArgs({
    options: CLI_ARGS,
  });
  const dbPath = path.join(getRootAnkiDir(), ankiUser, "collection.anki2");
  const db = new Database(dbPath, { readonly: true });
  const cardIds = getNeverShownCardsSync({
    noteTypes: [wordNoteType],
    db,
  });

  console.log(`Found ${cardIds.length} cards that have never been shown:\n`);
  for (const id of cardIds) {
    console.log(`  ${id}`);
  }
}

main();
