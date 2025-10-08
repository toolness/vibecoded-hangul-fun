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
} from "./src/database-spec.ts";
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

const NOTION_API_KEY = process.env.NOTION_API_KEY;

if (!NOTION_API_KEY) {
  throw new Error("Please define NOTION_API_KEY!");
}

const NOTION_DS_ID = process.env.NOTION_DS_ID;

if (!NOTION_DS_ID) {
  throw new Error("Please define NOTION_DS_ID!");
}

const CACHE_DIR = ".cache";

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

async function downloadSentences(args: {
  notion: CachingNotionClient;
  wordsDataSource: GetDataSourceResponse;
  downloader: NotionDownloader;
}): Promise<SentenceDatabaseRow[]> {
  const { notion, wordsDataSource, downloader } = args;
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
  const sentences: SentenceDatabaseRow[] = [];

  while (hasMore) {
    console.log(`Retrieving sentences...`);
    const response = await notion.queryDataSource({
      data_source_id: sentencesDataSourceId,
      start_cursor: nextCursor,
    });

    hasMore = response.has_more;
    nextCursor = response.next_cursor ?? undefined;

    for (const page of response.results) {
      if (!("properties" in page)) {
        continue;
      }

      // Extract the name/title of each sentence
      const properties = page.properties;
      let sentenceText = "";
      let audio: string | undefined;

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
            if (item.annotations.color === "gray_background") {
              doNotQuiz = true;
            }
            markupItems.push({ text: item.plain_text, wordId: id, doNotQuiz });
          }
        });
      }

      if (!("created_time" in page)) {
        throw new Error(`Page ${page.id} does not have a created time`);
      }

      sentences.push({
        id: page.id,
        createdTime: page.created_time,
        text: sentenceText,
        audio,
        markupItems: markupItems.length > 0 ? markupItems : undefined,
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
}): Promise<WordDatabaseRow[]> {
  const { notion, dataSourceId, sentences, downloader } = args;
  const entries: WordDatabaseRow[] = [];
  let hasMore = true;
  let nextCursor: string | undefined = undefined;

  while (hasMore) {
    console.log(`Retrieving words...`);
    const response = await notion.queryDataSource({
      data_source_id: dataSourceId,
      start_cursor: nextCursor,
    });

    hasMore = response.has_more;
    nextCursor = response.next_cursor ?? undefined;

    for (const page of response.results) {
      if (!("properties" in page)) {
        continue;
      }

      if (!("created_time" in page)) {
        throw new Error(`Page ${page.id} does not have a created time`);
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

      // Check Disabled flag (optional) - skip if true
      if (
        properties.Disabled &&
        properties.Disabled.type === "checkbox" &&
        properties.Disabled.checkbox === true
      ) {
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
      };

      entries.push(row);
    }
  }

  // Sort entries by created time, newest first, breaking ties by English name.
  entries.sort((a, b) => {
    const dateA = new Date(a.createdTime).getTime();
    const dateB = new Date(b.createdTime).getTime();
    if (dateA === dateB) {
      return a.name.localeCompare(b.name);
    }
    return dateB - dateA;
  });

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
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  writeFileSync(filepath, Buffer.from(buffer));
}

const run = async () => {
  const args = parseArgs({
    options: CLI_ARGS,
  });
  const {
    values: { overwrite },
  } = args;
  const notion = new CachingNotionClient({
    notion: new Client({ auth: NOTION_API_KEY }),
    isOffline: args.values.offline,
  });

  console.log("Downloading database...");

  for (const dirName of [CACHE_DIR, ASSETS_DIR]) {
    if (!existsSync(dirName)) {
      console.log(`Creating directory "${dirName}".`);
      mkdirSync(dirName, { recursive: true });
    }
  }

  // Create a queue with concurrency of 5
  const downloadQueue = new Queue({ concurrency: 5, autostart: false });

  const wordsDataSource = await notion.retrieveDataSource({
    data_source_id: NOTION_DS_ID,
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

  const sentences = await downloadSentences({
    notion,
    wordsDataSource,
    downloader,
  });
  const words = await downloadWords({
    notion,
    dataSourceId: NOTION_DS_ID,
    sentences: new Map<string, BaseSentence>(
      sentences.map(({ id, text, audio }) => [id, { text, audio }]),
    ),
    downloader,
  });

  // Start processing and wait for all downloads to complete
  if (downloadQueue.length > 0) {
    await downloadQueue.start();
  }

  const dbPath = getAssetFilePath(DB_JSON_ASSET);
  const database: Database = { words, sentences };
  writeFileSync(dbPath, JSON.stringify(database, null, 2));

  console.log(`Wrote ${dbPath}.`);
};

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
        `WARNING: Unable to determine file extension for ${fullLabel}.`,
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
        `WARNING: Unable to determine file extension for URL, skipping download: ${url}`,
      );
    }
  } else {
    console.log(
      `WARNING: Unsupported file type, skipping download: ${file.type}`,
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
