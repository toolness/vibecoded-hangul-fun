import { type Database } from "./src/database-spec.ts";
import { DB_JSON_ASSET, getAssetFilePath } from "./src/assets.ts";
import { DatabaseHelper } from "./src/database-helper.ts";

import { copyFileSync, existsSync, readFileSync, writeFileSync } from "fs";
import { stringify } from "csv-stringify/sync";
import path from "path";
import { createHash } from "crypto";
import { parseArgs, type ParseArgsOptionsConfig } from "util";
import { getRootAnkiDir } from "./src/anki-query.ts";

const CLI_ARGS = {
  /** The Anki user (used to find Anki directory to put static assets). */
  ankiUser: {
    type: "string",
    default: `User 1`,
  },
  /**
   * The Anki note type to populate the relevant CSV column with, for
   * words.
   */
  wordNoteType: {
    type: "string",
    default: `Atul's Picture Words`,
  },
  /**
   * The Anki note type to populate the relevant CSV column with, for
   * sentences.
   */
  sentenceNoteType: {
    type: "string",
    default: `Atul's Cloze Sentences`,
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
 * This is the first few columns of data that will be written
 * into each CSV row to be imported into Anki. Each row will be
 * mapped to an Anki note.
 *
 * For more details, see:
 *
 * https://docs.ankiweb.net/importing/text-files.html
 */
type BaseCsvRow = {
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
};

/**
 * Additional columns for CSV rows that represent sentences.
 */
type SentenceCsvRow = BaseCsvRow & {
  type: "sentence";

  /**
   * The Hangul for the sentence, with cloze tags:
   *
   * https://docs.ankiweb.net/editing.html#cloze-deletion
   */
  hangul: string;

  /**
   * The picture filenames for the sentence, relative to Anki's collection media
   * dir.
   */
  pictures: string[];

  /**
   * The pronunciation audio (mp3) filename for the sentence, relative to Anki's
   * collection media dir.
   */
  audio: string;

  /**
   * Any pronunciation notes, etc, to be shown on the back of the card.
   */
  notes: string[];
};

/**
 * Additional columns for CSV rows that represent words.
 */
type WordCsvRow = BaseCsvRow & {
  type: "word";

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

type CsvRow = WordCsvRow | SentenceCsvRow;

const PREAMBLE = `\
#separator:comma
#html:true
#notetype column:2
#deck column:3
#tags column:4`;

/**
 * Max word CSV rows to output. Set to `Infinity` for no limit.
 */
const MAX_WORD_ROWS = Infinity;

/**
 * Max sentence CSV rows to output. Set to `Infinity` for no limit.
 */
const MAX_SENTENCE_ROWS = Infinity;

const run = async () => {
  const {
    values: {
      ankiUser,
      mediaPrefix,
      wordNoteType,
      sentenceNoteType,
      deckName,
      outfile,
    },
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

  const copyAsset = (filename: string): string => {
    const destAsset = `${mediaPrefix}${filename}`;
    copyFileIfChangedSync(
      getAssetFilePath(filename),
      path.join(collectionMediaDir, destAsset),
    );
    return destAsset;
  };

  const dbHelper = new DatabaseHelper(dbRows);
  let wordRowCount = 0;
  for (const row of dbRows.words) {
    if (row.audio && row.picture?.type === "local-image" && row.hangul) {
      if (wordRowCount >= MAX_WORD_ROWS) {
        break;
      }
      const destPicture = copyAsset(row.picture.filename);
      const destAudio = copyAsset(row.audio);
      wordRowCount += 1;
      csvRows.push({
        type: "word",
        id: row.id,
        noteType: wordNoteType,
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

  let sentenceRowCount = 0;
  for (const row of dbRows.sentences) {
    if (!row.markupItems || !row.audio) {
      continue;
    }
    if (sentenceRowCount >= MAX_SENTENCE_ROWS) {
      break;
    }
    sentenceRowCount += 1;
    let clozeId = 0;
    const pictures: string[] = [];
    for (const word of dbHelper.getSentenceWords(row)) {
      if (word.picture && word.picture.type === "local-image") {
        pictures.push(copyAsset(word.picture.filename));
      }
    }
    const clozeParts: string[] = row.markupItems.map((item) => {
      if ((item.wordId && !item.doNotQuiz) || item.forceQuiz) {
        clozeId += 1;
        return `{{c${clozeId}::${item.text}}}`;
      } else {
        return item.text;
      }
    });
    const destAudio = copyAsset(row.audio);
    csvRows.push({
      type: "sentence",
      id: row.id,
      noteType: sentenceNoteType,
      deckName,
      tags: [],
      hangul: clozeParts.join(""),
      pictures,
      notes: [row.notes ?? ""].filter(Boolean),
      audio: destAudio,
    });
  }

  const encodedRows = stringify(
    csvRows.map((row) => {
      const baseRow = [
        row.id,
        escapeHTML(row.noteType),
        escapeHTML(row.deckName),
        row.tags.map((tag) => escapeHTML(convertToTag(tag))).join(" "),
      ];
      switch (row.type) {
        case "word":
          return [
            ...baseRow,
            escapeHTML(row.hangul),
            `<img src="${escapeHTML(row.picture)}">`,
            row.notes.map(escapeHTML).join("<br>"),
            `[sound:${escapeHTML(row.audio)}]`,
          ];
        case "sentence":
          return [
            ...baseRow,
            escapeHTML(row.hangul),
            row.pictures
              .map((picture) => `<img src="${escapeHTML(picture)}">`)
              .join(""),
            [
              `[sound:${escapeHTML(row.audio)}]`,
              ...row.notes.map(escapeHTML),
            ].join("<br>"),
          ];
      }
    }) satisfies string[][],
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

function loadDatabase(): Database {
  const data = readFileSync(getAssetFilePath(DB_JSON_ASSET), "utf-8");
  return JSON.parse(data) as Database;
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

await run();
