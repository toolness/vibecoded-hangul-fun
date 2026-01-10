import {
  Client,
  type GetDataSourceParameters,
  type GetDataSourceResponse,
  type QueryDataSourceParameters,
  type QueryDataSourceResponse,
} from "@notionhq/client";
import { writeFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import path, { join } from "path";
import dotenv from "dotenv";
import Queue from "queue";
import {
  type WordDatabaseRow,
  type SentenceMarkupItem,
  type WordPicture,
  type SentenceDatabaseRow,
  type BaseSentence,
  type Database,
  DATABASE_SCHEMA_VERSION,
  makeEmptyDatabase,
} from "./src/database-spec.ts";
import {
  sortByOrderingAndName,
  findMostRecentModificationTime,
  mergeEntries,
} from "./src/util.ts";
import { getHangulNotionDbConfig } from "./src/cli/notion-db.ts";
import { ASSETS_DIR, DB_JSON_ASSET, getAssetFilePath } from "./src/assets.ts";
import { parseArgs, type ParseArgsOptionsConfig } from "util";
import loadXxhash from "xxhash-wasm";
import { createHash } from "crypto";

const CLI_ARGS = {
  /** Always download files, overwriting existing ones? */
  overwrite: {
    type: "boolean",
    default: false,
  },
  /**
   * Whether to use cached API responses. Useful when iterating
   * on this tool and you don't want to have to wait for the network
   * all the time.
   */
  offline: {
    type: "boolean",
    default: false,
  },
} satisfies ParseArgsOptionsConfig;

dotenv.config();

const CACHE_DIR = ".cache";

// ANSI escape codes for colored terminal output
const RED = "\x1b[31m";
const RESET = "\x1b[0m";

/**
 * Ideally we'd reuse this from the Notion SDK
 * but its auto-generated types make this
 * virtually impossible.
 *
 * This is documented here: https://developers.notion.com/reference/file-object
 */
type File = {
  type?: string;
  name?: string;
  file?: { url: string; expiry_time?: string };
  external?: { url: string };
};

/**
 * Given info about a Notion file to download, enqueues it
 * for download and returns the resolved filename that it
 * will be downloaded to.
 */
type NotionDownloader = (
  download: NotionFileDownload,
) => Promise<string | undefined>;

class CachingNotionClient {
  notion: Client;
  isOffline: boolean;

  constructor(args: { notion: Client; isOffline: boolean }) {
    this.notion = args.notion;
    this.isOffline = args.isOffline;
  }

  private async cachedRetrieve<T>(
    key: unknown,
    download: () => Promise<T>,
  ): Promise<T> {
    const cacheKey = JSON.stringify(key);
    const sha256 = createHash("sha256").update(cacheKey).digest("hex");
    const cachedFile = path.join(CACHE_DIR, `${sha256}.json`);
    if (this.isOffline) {
      if (existsSync(cachedFile)) {
        return JSON.parse(readFileSync(cachedFile, { encoding: "utf-8" }));
      }
      console.log(
        `Cached response for ${cacheKey} does not exist, fetching from network.`,
      );
    }
    const response = await download();
    writeFileSync(cachedFile, JSON.stringify(response, null, 2), {
      encoding: "utf-8",
    });
    return response;
  }

  async queryDataSource(
    args: QueryDataSourceParameters,
  ): Promise<QueryDataSourceResponse> {
    return this.cachedRetrieve(
      {
        type: "queryDataSource",
        args,
      },
      () => this.notion.dataSources.query(args),
    );
  }

  async retrieveDataSource(
    args: GetDataSourceParameters,
  ): Promise<GetDataSourceResponse> {
    return this.cachedRetrieve(
      {
        type: "retrieveDataSource",
        args,
      },
      () => this.notion.dataSources.retrieve(args),
    );
  }
}

/**
 * Loads the existing database from disk if it exists.
 * Returns an empty database if the file doesn't exist or can't be parsed.
 */
function loadExistingDatabase(dbPath: string): Database {
  if (!existsSync(dbPath)) {
    console.log("No existing database found, will download all entries.");
    return makeEmptyDatabase();
  }

  try {
    const content = readFileSync(dbPath, { encoding: "utf-8" });
    const database = JSON.parse(content) as Database;
    if (database.__schemaVersion !== DATABASE_SCHEMA_VERSION) {
      console.log(
        `Database exists but version is ${database.__schemaVersion} (expected ${DATABASE_SCHEMA_VERSION}).`,
      );
      return makeEmptyDatabase();
    }
    console.log(
      `Loaded existing database with ${database.words.length} words and ${database.sentences.length} sentences.`,
    );
    return database;
  } catch (error) {
    console.warn(
      `Failed to parse existing database, will download all entries: ${error}`,
    );
    return makeEmptyDatabase();
  }
}

async function downloadSentences(args: {
  notion: CachingNotionClient;
  wordsDataSource: GetDataSourceResponse;
  downloader: NotionDownloader;
  modifiedSince?: string;
}): Promise<Array<SentenceDatabaseRow & { disabled?: boolean }>> {
  const { notion, wordsDataSource, downloader, modifiedSince } = args;
  const sentencesColumnSchema = wordsDataSource.properties["Sentences"];
  if (sentencesColumnSchema?.type !== "relation") {
    throw new Error(
      `Expected data source to have a relation column called "Sentences"`,
    );
  }
  const sentencesDataSourceId = sentencesColumnSchema.relation.data_source_id;

  // Download all sentences from the related table
  let hasMore = true;
  let nextCursor: string | undefined = undefined;
  const sentences: Array<SentenceDatabaseRow & { disabled?: boolean }> = [];

  while (hasMore) {
    if (modifiedSince) {
      console.log(`Retrieving sentences modified since ${modifiedSince}...`);
    } else {
      console.log(`Retrieving sentences...`);
    }
    const response = await notion.queryDataSource({
      data_source_id: sentencesDataSourceId,
      start_cursor: nextCursor,
      ...(modifiedSince && {
        filter: {
          timestamp: "last_edited_time",
          last_edited_time: {
            on_or_after: modifiedSince,
          },
        },
      }),
    });

    hasMore = response.has_more;
    nextCursor = response.next_cursor ?? undefined;

    for (const page of response.results) {
      if (!("properties" in page)) {
        continue;
      }

      // Extract the name/title of each sentence
      const properties = page.properties;

      // Check Disabled flag (optional)
      const isDisabled =
        properties.Disabled &&
        properties.Disabled.type === "checkbox" &&
        properties.Disabled.checkbox === true;

      // If disabled and we're doing a full sync, skip it entirely
      // If disabled and doing an incremental sync, record it as a tombstone
      if (isDisabled) {
        if (!modifiedSince) {
          continue;
        } else {
          // Add as tombstone for incremental sync
          sentences.push({
            id: page.id,
            disabled: true,
          } as SentenceDatabaseRow & { disabled: true });
          continue;
        }
      }

      let sentenceText = "";
      let notes = "";
      let audio: string | undefined;
      let lastIncorrect: string | undefined;

      // Try to extract from Name property (could be title or rich_text)
      if (properties.Name) {
        if (
          properties.Name.type === "title" &&
          Array.isArray(properties.Name.title) &&
          properties.Name.title.length > 0
        ) {
          sentenceText = properties.Name.title[0].plain_text;
        } else if (
          properties.Name.type === "rich_text" &&
          Array.isArray(properties.Name.rich_text) &&
          properties.Name.rich_text.length > 0
        ) {
          sentenceText = properties.Name.rich_text[0].plain_text;
        }
      }

      // If no Name property, try to find any title property
      if (!sentenceText) {
        for (const value of Object.values(properties)) {
          if (
            value.type === "title" &&
            Array.isArray(value.title) &&
            value.title.length > 0
          ) {
            sentenceText = value.title[0].plain_text;
            break;
          }
        }
      }

      if (!sentenceText) {
        continue;
      }

      // Extract Audio files (optional)
      if (
        properties.Audio &&
        properties.Audio.type === "files" &&
        Array.isArray(properties.Audio.files) &&
        properties.Audio.files.length > 0
      ) {
        audio = await downloader({
          file: properties.Audio.files[0],
          label: "sentence audio",
          baseName: `sentence-${page.id}`,
        });
      }

      const markupItems: SentenceMarkupItem[] = [];

      if (
        properties.Markup &&
        properties.Markup.type === "rich_text" &&
        properties.Markup.rich_text.length > 0
      ) {
        properties.Markup.rich_text.forEach((item) => {
          if (item.type === "text") {
            const idMatch = item.href?.match(/^\/([0-9a-f]+)$/);
            let id: string | undefined;
            if (idMatch) {
              id = addDashesToUuid(idMatch[1]);
            }
            let doNotQuiz: true | undefined;
            let forceQuiz: true | undefined;
            if (item.annotations.color === "gray_background") {
              doNotQuiz = true;
            } else if (item.annotations.underline && !id) {
              forceQuiz = true;
            }
            markupItems.push({
              text: item.plain_text,
              wordId: id,
              doNotQuiz,
              forceQuiz,
            });
          }
        });
      }

      const wordIds: string[] = [];

      if (
        properties["Words"] &&
        properties["Words"].type === "relation" &&
        Array.isArray(properties["Words"].relation)
      ) {
        for (const relation of properties["Words"].relation) {
          wordIds.push(relation.id);
        }
      }

      // Extract Notes (optional)
      if (
        properties.Notes &&
        properties.Notes.type === "rich_text" &&
        Array.isArray(properties.Notes.rich_text) &&
        properties.Notes.rich_text.length > 0
      ) {
        notes = properties.Notes.rich_text.map((t) => t.plain_text).join("");
      }

      // Extract Last incorrect date (optional)
      if (
        properties["Last incorrect"] &&
        properties["Last incorrect"].type === "date" &&
        properties["Last incorrect"].date &&
        properties["Last incorrect"].date.start
      ) {
        lastIncorrect = properties["Last incorrect"].date.start;
      }

      if (!("created_time" in page) || !("last_edited_time" in page)) {
        throw new Error(
          `Page ${page.id} does not have a created time or last edited time`,
        );
      }

      sentences.push({
        id: page.id,
        createdTime: page.created_time,
        lastModifiedTime: page.last_edited_time,
        text: sentenceText,
        audio,
        markupItems: markupItems.length > 0 ? markupItems : undefined,
        wordIds: wordIds.length > 0 ? wordIds : undefined,
        notes,
        lastIncorrect,
      });
    }
  }

  return sentences;
}

/**
 * Converts a UUID without dashes to one with dashes.
 *
 * Example: "2770b5d6dd6180a086ccc862ccaa2f13" => "2770b5d6-dd61-80a0-86cc-cc862ccaa2f13"
 */
function addDashesToUuid(uuid: string): string {
  return uuid.replace(
    /^([0-9a-f]{8})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{4})([0-9a-f]{12})$/,
    "$1-$2-$3-$4-$5",
  );
}

async function downloadWords(args: {
  notion: CachingNotionClient;
  dataSourceId: string;
  sentences: Map<string, BaseSentence>;
  downloader: NotionDownloader;
  modifiedSince?: string;
}): Promise<Array<WordDatabaseRow & { disabled?: boolean }>> {
  const { notion, dataSourceId, sentences, downloader, modifiedSince } = args;
  const entries: Array<WordDatabaseRow & { disabled?: boolean }> = [];
  let hasMore = true;
  let nextCursor: string | undefined = undefined;

  while (hasMore) {
    if (modifiedSince) {
      console.log(`Retrieving words modified since ${modifiedSince}...`);
    } else {
      console.log(`Retrieving words...`);
    }
    const response = await notion.queryDataSource({
      data_source_id: dataSourceId,
      start_cursor: nextCursor,
      ...(modifiedSince && {
        filter: {
          timestamp: "last_edited_time",
          last_edited_time: {
            on_or_after: modifiedSince,
          },
        },
      }),
    });

    hasMore = response.has_more;
    nextCursor = response.next_cursor ?? undefined;

    for (const page of response.results) {
      if (!("properties" in page)) {
        continue;
      }

      if (!("created_time" in page) || !("last_edited_time" in page)) {
        throw new Error(
          `Page ${page.id} does not have a created time or last edited time`,
        );
      }

      const properties = page.properties;

      // Validate required properties exist
      if (!properties.Name || !properties.Hangul) {
        throw new Error(
          "Database schema validation failed: Missing required columns.\n" +
            "Required columns: Name (Text), Hangul (Text), URL (URL)\n" +
            "Please ensure your Notion database has these columns with the exact names.",
        );
      }

      // Extract values based on property types
      let name = "";
      let hangul = "";
      let url = "";
      let picture: WordPicture | undefined;
      let audio: string | undefined;
      let category = "";
      let notes = "";
      let isTranslation = false;
      let lastIncorrect: string | undefined;

      // Extract Name
      if (
        properties.Name.type === "title" &&
        Array.isArray(properties.Name.title) &&
        properties.Name.title.length > 0
      ) {
        name = properties.Name.title[0].plain_text;
      } else if (
        properties.Name.type === "rich_text" &&
        Array.isArray(properties.Name.rich_text) &&
        properties.Name.rich_text.length > 0
      ) {
        name = properties.Name.rich_text[0].plain_text;
      }

      // Use sanitized name based on row name
      const baseFilename = name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

      // Extract Hangul
      if (
        properties.Hangul.type === "rich_text" &&
        Array.isArray(properties.Hangul.rich_text) &&
        properties.Hangul.rich_text.length > 0
      ) {
        hangul = properties.Hangul.rich_text[0].plain_text;
      } else if (
        properties.Hangul.type === "title" &&
        Array.isArray(properties.Hangul.title) &&
        properties.Hangul.title.length > 0
      ) {
        hangul = properties.Hangul.title[0].plain_text;
      }

      // Extract URL (optional)
      if (
        properties.URL &&
        properties.URL.type === "url" &&
        typeof properties.URL.url === "string"
      ) {
        url = properties.URL.url;
      }

      // Extract Image URL (optional)
      const imageFiles: File[] = [];
      if (
        properties["Image URL"] &&
        properties["Image URL"].type === "url" &&
        typeof properties["Image URL"].url === "string" &&
        properties["Image URL"].url
      ) {
        imageFiles.push({
          type: "external",
          external: {
            url: properties["Image URL"].url,
          },
        });
      }
      if (
        properties.Image &&
        properties.Image.type === "files" &&
        Array.isArray(properties.Image.files)
      ) {
        imageFiles.push(...properties.Image.files);
      }
      if (imageFiles.length > 0) {
        const filename = await downloader({
          file: imageFiles[0],
          label: "image",
          baseName: baseFilename,
        });
        if (filename) {
          picture = {
            type: "local-image",
            filename,
          };
        }
      }

      // Extract Emojis (optional)
      if (
        !picture &&
        properties.Emojis &&
        properties.Emojis.type === "rich_text" &&
        Array.isArray(properties.Emojis.rich_text) &&
        properties.Emojis.rich_text.length > 0
      ) {
        const emojis = properties.Emojis.rich_text
          .map((t) => t.plain_text)
          .join("");
        if (emojis) {
          picture = {
            type: "emojis",
            emojis,
          };
        }
      }

      // Extract Category (optional)
      if (
        properties.Category &&
        properties.Category.type === "select" &&
        properties.Category.select &&
        "name" in properties.Category.select &&
        typeof properties.Category.select.name === "string"
      ) {
        category = properties.Category.select.name;
      }

      // Extract Notes (optional)
      if (
        properties.Notes &&
        properties.Notes.type === "rich_text" &&
        Array.isArray(properties.Notes.rich_text) &&
        properties.Notes.rich_text.length > 0
      ) {
        notes = properties.Notes.rich_text.map((t) => t.plain_text).join("");
      }

      // Extract Is translation? checkbox
      if (
        properties["Is translation?"] &&
        properties["Is translation?"].type === "checkbox"
      ) {
        isTranslation = properties["Is translation?"].checkbox === true;
      }

      // Extract Last incorrect date (optional)
      if (
        properties["Last incorrect"] &&
        properties["Last incorrect"].type === "date" &&
        properties["Last incorrect"].date &&
        properties["Last incorrect"].date.start
      ) {
        lastIncorrect = properties["Last incorrect"].date.start;
      }

      // Check Disabled flag (optional)
      const isDisabled =
        properties.Disabled &&
        properties.Disabled.type === "checkbox" &&
        properties.Disabled.checkbox === true;

      // If disabled and we're doing a full sync, skip it entirely
      // If disabled and doing an incremental sync, record it as a tombstone
      if (isDisabled) {
        if (!modifiedSince) {
          continue;
        } else {
          // Add as tombstone for incremental sync
          entries.push({
            id: page.id,
            disabled: true,
          } as WordDatabaseRow & { disabled: true });
          continue;
        }
      }

      // Extract Audio files (optional)
      if (
        properties.Audio &&
        properties.Audio.type === "files" &&
        Array.isArray(properties.Audio.files) &&
        properties.Audio.files.length > 0
      ) {
        audio = await downloader({
          file: properties.Audio.files[0],
          label: "audio",
          baseName: baseFilename,
        });
      }

      // Extract Minimal pairs (optional)
      let minimalPairs: string[] = [];
      if (
        properties["Minimal pairs"] &&
        properties["Minimal pairs"].type === "relation" &&
        Array.isArray(properties["Minimal pairs"].relation)
      ) {
        minimalPairs = properties["Minimal pairs"].relation.map((r) => r.id);
      }

      // Extract Sentences relation and map the first one to exampleSentence
      let exampleSentence: BaseSentence | undefined;
      if (
        properties["Sentences"] &&
        properties["Sentences"].type === "relation" &&
        Array.isArray(properties["Sentences"].relation) &&
        properties["Sentences"].relation.length > 0
      ) {
        // Get the first sentence ID from the relation
        const firstSentenceId = properties["Sentences"].relation[0].id;
        // Look it up in our sentences map
        exampleSentence = sentences.get(firstSentenceId);
      }

      const row: WordDatabaseRow = {
        id: page.id,
        createdTime: page.created_time,
        lastModifiedTime: page.last_edited_time,
        name,
        hangul,
        isTranslation,
        url,
        picture,
        audio,
        category,
        notes,
        minimalPairs: minimalPairs.length > 0 ? minimalPairs : undefined,
        exampleSentence,
        lastIncorrect,
      };

      entries.push(row);
    }
  }

  sortByOrderingAndName("created-by", entries);

  return entries;
}

async function downloadFile(
  args: DownloadInfo & {
    overwrite: boolean;
  },
): Promise<void> {
  const { url, filename, overwrite } = args;
  const filepath = join(ASSETS_DIR, filename);
  if (existsSync(filepath) && !overwrite) {
    // For now, don't download files that already exist.
    // In the future we can use last-modified timestamps or something
    // to make this smarter.
    console.log(
      `Skipping ${filename}, it already exists (use --overwrite to override).`,
    );
    return;
  }
  console.log(`Downloading ${filename}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download file at ${url}: ${response.statusText}`,
    );
  }
  const buffer = await response.arrayBuffer();
  writeFileSync(filepath, Buffer.from(buffer));
}

function generateMarkdownContent(
  words: WordDatabaseRow[],
  sentences: SentenceDatabaseRow[],
): string {
  const lines: string[] = [];

  lines.push("# Vocabulary");
  lines.push("");
  lines.push(
    `Generated on ${new Date().toISOString().split("T")[0]} - ${words.length} words, ${sentences.length} sentences`,
  );
  lines.push("");

  // Words section
  lines.push("## Words");
  lines.push("");
  for (const word of words) {
    lines.push(`- **${word.hangul}** (${word.name})`);
  }
  lines.push("");

  // Sentences section
  lines.push("## Sentences");
  lines.push("");
  for (const sentence of sentences) {
    lines.push(`- ${sentence.text}`);
  }
  lines.push("");

  return lines.join("\n");
}

const run = async () => {
  const args = parseArgs({
    options: CLI_ARGS,
  });
  const {
    values: { overwrite },
  } = args;
  const config = getHangulNotionDbConfig(process.env);
  const notion = new CachingNotionClient({
    notion: new Client({ auth: config.apiKey }),
    isOffline: args.values.offline,
  });

  console.log("Downloading database...");

  for (const dirName of [CACHE_DIR, ASSETS_DIR]) {
    if (!existsSync(dirName)) {
      console.log(`Creating directory "${dirName}".`);
      mkdirSync(dirName, { recursive: true });
    }
  }

  // Load existing database and find most recent modification times
  const dbPath = getAssetFilePath(DB_JSON_ASSET);
  const existingDb = loadExistingDatabase(dbPath);
  const lastWordModifiedTime = findMostRecentModificationTime(existingDb.words);
  const lastSentenceModifiedTime = findMostRecentModificationTime(
    existingDb.sentences,
  );

  if (lastWordModifiedTime) {
    console.log(
      `Most recent word modification: ${lastWordModifiedTime}, will download only newer entries.`,
    );
  }
  if (lastSentenceModifiedTime) {
    console.log(
      `Most recent sentence modification: ${lastSentenceModifiedTime}, will download only newer entries.`,
    );
  }

  // Create a queue with concurrency of 5
  const downloadQueue = new Queue({ concurrency: 5, autostart: false });

  const wordsDataSource = await notion.retrieveDataSource({
    data_source_id: config.dataSourceId,
  });
  const downloader: NotionDownloader = async (download) => {
    const downloadInfo = await getDownloadInfo(download);
    if (downloadInfo) {
      downloadQueue.push(async () =>
        downloadFile({
          ...downloadInfo,
          overwrite,
        }),
      );
      return downloadInfo.filename;
    }
  };

  const newSentences = await downloadSentences({
    notion,
    wordsDataSource,
    downloader,
    modifiedSince: lastSentenceModifiedTime,
  });
  const newWords = await downloadWords({
    notion,
    dataSourceId: config.dataSourceId,
    sentences: new Map<string, BaseSentence>(
      newSentences
        .filter((s) => !s.disabled)
        .map(({ id, text, audio }) => [id, { text, audio }]),
    ),
    downloader,
    modifiedSince: lastWordModifiedTime,
  });

  // Merge old and new data
  console.log(
    `Merging ${existingDb.sentences.length} existing sentences with ${newSentences.length} possible new/updated sentences...`,
  );
  const sentences = mergeEntries(
    existingDb.sentences,
    newSentences,
    (entry) => entry.disabled === true,
  );

  console.log(
    `Merging ${existingDb.words.length} existing words with ${newWords.length} possible new/updated words...`,
  );
  const words = mergeEntries(
    existingDb.words,
    newWords,
    (entry) => entry.disabled === true,
  );

  // Sort the merged words data
  sortByOrderingAndName("created-by", words);

  console.log(
    `Final database has ${words.length} words and ${sentences.length} sentences.`,
  );

  // Start processing and wait for all downloads to complete
  if (downloadQueue.length > 0) {
    await downloadQueue.start();
  }

  const database: Database = {
    words,
    sentences,
    __schemaVersion: DATABASE_SCHEMA_VERSION,
  };
  writeFileSync(dbPath, JSON.stringify(database, null, 2));

  console.log(`Wrote ${dbPath}.`);

  // Write markdown file with all words and sentences
  const markdownPath = "vocabulary.md";
  const markdownContent = generateMarkdownContent(words, sentences);
  writeFileSync(markdownPath, markdownContent);

  console.log(`Wrote ${markdownPath}.`);

  // Check for duplicates and display warnings
  displayDuplicateWarnings(words, sentences);
};

function displayDuplicateWarnings(
  words: WordDatabaseRow[],
  sentences: SentenceDatabaseRow[],
): void {
  // Check for duplicate words (by hangul)
  const wordsByHangul = new Map<string, WordDatabaseRow[]>();
  for (const word of words) {
    const existing = wordsByHangul.get(word.hangul) ?? [];
    existing.push(word);
    wordsByHangul.set(word.hangul, existing);
  }

  for (const [hangul, duplicates] of wordsByHangul) {
    if (duplicates.length > 1) {
      const names = duplicates.map((w) => w.name).join(", ");
      console.log(
        `${RED}WARNING: Duplicate word hangul "${hangul}" found in entries: ${names}${RESET}`,
      );
    }
  }

  // Check for duplicate sentences (by text)
  const sentencesByText = new Map<string, SentenceDatabaseRow[]>();
  for (const sentence of sentences) {
    const existing = sentencesByText.get(sentence.text) ?? [];
    existing.push(sentence);
    sentencesByText.set(sentence.text, existing);
  }

  for (const [text, duplicates] of sentencesByText) {
    if (duplicates.length > 1) {
      console.log(
        `${RED}WARNING: Duplicate sentence "${text}" found ${duplicates.length} times${RESET}`,
      );
    }
  }
}

async function makeHash(value: string): Promise<string> {
  const xxhash = await loadXxhash();
  const hexHash = await xxhash.h32ToString(value, 0); // 0 is the seed
  const hash = Buffer.from(hexHash, "hex").toString("base64url");
  return hash;
}

type DownloadInfo = {
  /** Remote URL to retrieve. */
  url: string;
  /** Local filename to save to (not including path). */
  filename: string;
};

type NotionFileDownload = {
  /** The Notion file to download. */
  file: File;
  /** Debugging label for the file. */
  label: string;
  /**
   * Base filename for the file when downloaded, without any
   * extension. This will
   * not be the final filename (a hash will be appended to it).
   */
  baseName: string;
};

async function getDownloadInfo(
  args: NotionFileDownload,
): Promise<DownloadInfo | undefined> {
  const { file, label, baseName } = args;
  const fullLabel = `${label} "${baseName}"`;
  let url = "";
  let filename = "";

  if (file.type === "file" && file.file) {
    url = file.file.url;
    // Extract filename from URL or use a default
    const urlParts = url.split("/");
    const originalName = urlParts[urlParts.length - 1].split("?")[0];
    const extension = originalName.split(".").pop();
    // Base the hash on the original filename: this means if the user
    // wants to change the image, they should change the filename so
    // it has a different hash.
    const hash = await makeHash(originalName);

    if (extension) {
      filename = `${baseName}-${hash}.${extension}`;
    } else {
      console.warn(
        `${RED}WARNING: Unable to determine file extension for ${fullLabel}.${RESET}`,
      );
    }
  } else if (file.type === "external" && file.external) {
    url = file.external.url;
    // Determine file extension from URL
    let extension: string | undefined;
    const urlParts = url.split(".");
    const lastPart = urlParts[urlParts.length - 1].split("?")[0];
    if (
      ["jpg", "jpeg", "png", "gif", "webp", "svg", "mp3", "ogg"].includes(
        lastPart.toLowerCase(),
      )
    ) {
      extension = lastPart.toLowerCase();
    }
    if (extension) {
      // Base the hash on the URL: this means if the user
      // wants to change the image, they should change the URL so
      // it has a different hash.
      const hash = await makeHash(url);
      filename = `${baseName}-${hash}.${extension}`;
    } else {
      console.log(
        `${RED}WARNING: Unable to determine file extension for URL, skipping download: ${url}${RESET}`,
      );
    }
  } else {
    console.log(
      `${RED}WARNING: Unsupported file type, skipping download: ${file.type}${RESET}`,
    );
  }

  if (url && filename) {
    return {
      url,
      filename,
    };
  }
}

await run();
