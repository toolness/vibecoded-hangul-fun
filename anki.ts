import { type DatabaseRow } from "./src/database-spec.ts";
import { DB_JSON_ASSET, getAssetFilePath } from "./src/assets.ts";

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { stringify } from "csv-stringify/sync";
import path from "path";
import { createHash } from "crypto";
import { parseArgs, type ParseArgsOptionsConfig } from "util";

const CLI_ARGS = {
  /** The Anki user (used to find Anki directory to put static assets). */
  ankiUser: {
    type: "string",
    default: `User 1`,
  },
  /** The Anki note type to populate the relevant CSV column with. */
  noteType: {
    type: "string",
    default: `Atul's Picture Words`,
  },
  /** The Anki deck to add the notes to. */
  deckName: {
    type: "string",
    default: `Atul's Korean Words`,
  },
  /**
   * When copying images/audio to the user's Anki collection media
   * dir, prefix them with this string.
   */
  mediaPrefix: {
    type: "string",
    default: "atul-",
  },
  /**
   * Where to write the output CSV file.
   */
  outfile: {
    type: "string",
    default: path.join(getDesktopDir(), `atuls-anki-deck.csv`),
  },
} satisfies ParseArgsOptionsConfig;

/**
 * This is the data that will be written into each
 * CSV row to be imported into Anki. Each row will be
 * mapped to an Anki note.
 *
 * For more details, see:
 *
 * https://docs.ankiweb.net/importing/text-files.html
 */
type CsvRow = {
  /**
   * This is actually the database row ID from our DB, _not_
   * the Anki GUID. According to Anki's documentation, the Anki GUID
   * is assigned by Anki, not us:
   *
   *   https://docs.ankiweb.net/importing/text-files.html#guid-column
   *
   * We need to be sure to write this as the very first column of
   * the CSV to ensure Anki can properly update rows and such.
   */
  id: string;

  /**
   * See https://docs.ankiweb.net/importing/text-files.html#notetype-column.
   */
  noteType: string;

  /**
   * See https://docs.ankiweb.net/importing/text-files.html#deck-column.
   */
  deckName: string;

  /**
   * List of Anki tags to apply to the note. Spaces will be replaced with
   * `::`.
   */
  tags: string[];

  /**
   * The Hangul for the word.
   */
  hangul: string;

  /**
   * The picture filename for the word, relative to Anki's collection media
   * dir.
   */
  picture: string;

  /**
   * Any pronunciation notes, etc, to be shown on the back of the card.
   */
  notes: string[];

  /**
   * The pronunciation audio (mp3) filename for the word, relative to Anki's
   * collection media dir.
   */
  audio: string;
};

const PREAMBLE = `\
#separator:comma
#html:true
#notetype column:2
#deck column:3
#tags column:4`;

/**
 * Max CSV rows to output. Set to `Infinity` for no limit.
 */
const MAX_ROWS = Infinity;

const run = async () => {
  const {
    values: { ankiUser, mediaPrefix, noteType, deckName, outfile },
  } = parseArgs({
    options: CLI_ARGS,
  });
  const rootAnkiDir = getRootAnkiDir();
  const userDir = path.join(rootAnkiDir, ankiUser);
  // https://docs.ankiweb.net/importing/text-files.html#importing-media
  const collectionMediaDir = path.join(userDir, "collection.media");
  for (const dir of [rootAnkiDir, userDir, collectionMediaDir]) {
    if (!existsSync(dir)) {
      throw new Error(`Anki directory does not exist: ${dir}`);
    }
  }
  console.log("Media will be copied to:", collectionMediaDir);
  const dbRows = loadDatabase();
  const csvRows: CsvRow[] = [];

  let rowCount = 0;
  for (const row of dbRows) {
    if (row.audio && row.picture?.type === "local-image" && row.hangul) {
      if (rowCount >= MAX_ROWS) {
        break;
      }
      const destPicture = `${mediaPrefix}${row.picture.filename}`;
      copyFileIfChangedSync(
        getAssetFilePath(row.picture.filename),
        path.join(collectionMediaDir, destPicture),
      );
      const destAudio = `${mediaPrefix}${row.audio}`;
      copyFileIfChangedSync(
        getAssetFilePath(row.audio),
        path.join(collectionMediaDir, destAudio),
      );
      rowCount += 1;
      csvRows.push({
        id: row.id,
        noteType,
        deckName,
        tags: row.category ? [row.category] : [],
        hangul: row.hangul,
        picture: destPicture,
        notes: [row.notes ?? "", row.exampleSentence?.text ?? ""].filter(
          Boolean,
        ),
        audio: destAudio,
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
      row.notes.map(escapeHTML).join("<br>"),
      `[sound:${escapeHTML(row.audio)}]`,
    ]),
  );

  const csv = [PREAMBLE, encodedRows].join("\n");
  writeFileSync(outfile, csv, { encoding: "utf-8" });
  console.log(`Wrote ${outfile}.`);
};

// https://stackoverflow.com/a/57448862
// https://docs.ankiweb.net/importing/text-files.html#html
const escapeHTML = (str: string) =>
  str.replace(
    /[&<>]/g,
    (tag) =>
      // The "UNKNOWN" below should never show up b/c the regexp should
      // only match the stuff in the record above
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
      })[tag] ?? "UNKNOWN",
  );

/**
 * Copy the file from `src` to `dest`. If `dest` is already the same
 * as `src`, however (specifically, if it has the same SHA-256 hash),
 * do nothing.
 */
function copyFileIfChangedSync(src: string, dest: string) {
  // Implemented by GitHub Copilot.
  function sha256File(filePath: string): string {
    const data = readFileSync(filePath);
    return createHash("sha256").update(data).digest("hex");
  }

  if (existsSync(dest)) {
    const srcHash = sha256File(src);
    const destHash = sha256File(dest);
    if (srcHash === destHash) {
      return;
    }
  }
  console.log(`Copying ${src} -> ${dest}.`);
  copyFileSync(src, dest);
}

function convertToTag(value: string) {
  return value.replace(/ /g, "::");
}

function loadDatabase(): DatabaseRow[] {
  const data = readFileSync(getAssetFilePath(DB_JSON_ASSET), "utf-8");
  return JSON.parse(data) as DatabaseRow[];
}

function getDesktopDir(): string {
  // Implemented by Github Copilot.
  const platform = process.platform;
  if (platform === "darwin") {
    // macOS
    return `${process.env.HOME}/Desktop`;
  } else if (platform === "win32") {
    // Windows
    return `${process.env.USERPROFILE}\\Desktop`;
  } else {
    throw new Error("Unsupported OS for desktop directory");
  }
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
