import { Client, type GetDataSourceResponse } from "@notionhq/client";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
import Queue from "queue";
import { type DatabaseRow, type WordPicture } from "./src/database-spec.ts";
import { ASSETS_DIR, DB_JSON_ASSET, getAssetFilePath } from "./src/assets.ts";
import { parseArgs, type ParseArgsOptionsConfig } from "util";

const CLI_ARGS = {
  /** Always download files, overwriting existing ones? */
  overwrite: {
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

/**
 * Ideally we'd reuse this from the Notion SDK
 * but its auto-generated types make this
 * virtually impossible.
 */
type File = {
  type?: string;
  name?: string;
  file?: { url: string; expiry_time?: string };
  external?: { url: string };
};

type DatabaseEntry = {
  row: DatabaseRow;
  imageFiles: File[];
  audioFiles: File[];
  imageUrl?: string;
};

async function downloadSentences(
  notion: Client,
  wordsDataSource: GetDataSourceResponse,
): Promise<Map<string, string>> {
  const sentences = new Map<string, string>();
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

  while (hasMore) {
    console.log(`Retrieving sentences...`);
    const response = await notion.dataSources.query({
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

      if (sentenceText) {
        sentences.set(page.id, sentenceText);
      }
    }
  }

  return sentences;
}

async function downloadDatabase(
  notion: Client,
  id: string,
): Promise<DatabaseEntry[]> {
  const dataSource = await notion.dataSources.retrieve({
    data_source_id: id,
  });
  const sentences = await downloadSentences(notion, dataSource);

  const entries: DatabaseEntry[] = [];
  let hasMore = true;
  let nextCursor: string | undefined = undefined;

  while (hasMore) {
    console.log(`Retrieving words...`);
    const response = await notion.dataSources.query({
      data_source_id: id,
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
      let imageUrl = "";
      let emojis = "";
      let category = "";
      let notes = "";
      let isTranslation = false;
      let imageFiles: File[] = [];
      let audioFiles: File[] = [];

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
      if (
        properties["Image URL"] &&
        properties["Image URL"].type === "url" &&
        typeof properties["Image URL"].url === "string"
      ) {
        imageUrl = properties["Image URL"].url;
      }

      // Extract Emojis (optional)
      if (
        properties.Emojis &&
        properties.Emojis.type === "rich_text" &&
        Array.isArray(properties.Emojis.rich_text) &&
        properties.Emojis.rich_text.length > 0
      ) {
        emojis = properties.Emojis.rich_text.map((t) => t.plain_text).join("");
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

      // Extract Image files (optional)
      if (
        properties.Image &&
        properties.Image.type === "files" &&
        Array.isArray(properties.Image.files)
      ) {
        imageFiles = properties.Image.files;
      }

      // Extract Audio files (optional)
      if (
        properties.Audio &&
        properties.Audio.type === "files" &&
        Array.isArray(properties.Audio.files)
      ) {
        audioFiles = properties.Audio.files;
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
      let exampleSentence: string | undefined;
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

      // Convert to WordPicture format - prioritize emojis
      let picture: WordPicture | undefined;
      if (emojis) {
        picture = {
          type: "emojis",
          emojis,
        };
      }

      const row: DatabaseRow = {
        id: page.id,
        createdTime: page.created_time,
        name,
        hangul,
        isTranslation,
        url,
        picture,
        category,
        notes,
        minimalPairs: minimalPairs.length > 0 ? minimalPairs : undefined,
        exampleSentence,
      };

      entries.push({
        row,
        imageFiles,
        audioFiles,
        imageUrl,
      });
    }
  }

  // Sort entries by created time, newest first, breaking ties by English name.
  entries.sort((a, b) => {
    const dateA = new Date(a.row.createdTime).getTime();
    const dateB = new Date(b.row.createdTime).getTime();
    if (dateA === dateB) {
      return a.row.name.localeCompare(b.row.name);
    }
    return dateB - dateA;
  });

  return entries;
}

async function downloadFile(args: {
  url: string;
  filename: string;
  overwrite: boolean;
}): Promise<void> {
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
  const notion = new Client({ auth: NOTION_API_KEY });

  console.log("Downloading database...");

  const entries = await downloadDatabase(notion, NOTION_DS_ID);

  // Ensure assets directory exists
  if (!existsSync(ASSETS_DIR)) {
    mkdirSync(ASSETS_DIR, { recursive: true });
  }

  // Create a queue with concurrency of 5
  const downloadQueue = new Queue({ concurrency: 5, autostart: false });

  // Prepare rows and queue all downloads
  const rows: DatabaseRow[] = [];

  for (const { row, imageFiles, audioFiles, imageUrl } of entries) {
    // Use sanitized name based on row name
    const baseName = row.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

    // Queue image download from files
    if (imageFiles.length > 0) {
      downloadQueue.push(async () => {
        const filename = await maybeDownloadFirstFile({
          files: imageFiles,
          label: "image",
          baseName,
          overwrite,
        });
        if (filename) {
          row.picture = {
            type: "local-image",
            filename,
          };
        }
      });
    }
    // Queue remote image URL download if no file but has imageUrl
    else if (imageUrl && !row.picture) {
      // Determine file extension from URL or default to jpg
      let extension: string | undefined;
      const urlParts = imageUrl.split(".");
      const lastPart = urlParts[urlParts.length - 1].split("?")[0];
      if (
        ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(
          lastPart.toLowerCase(),
        )
      ) {
        extension = lastPart.toLowerCase();
      }
      if (!extension) {
        console.log(
          `WARNING: Unable to determine file extension for image URL, skipping download: ${imageUrl}`,
        );
        continue;
      }
      const filename = `${baseName}.${extension}`;
      downloadQueue.push(async () => {
        try {
          await downloadFile({ url: imageUrl, filename, overwrite });
          row.picture = {
            type: "local-image",
            filename,
          };
        } catch (error) {
          console.error(
            `Failed to download remote image for "${row.name}":`,
            error,
          );
          throw error;
        }
      });
    }

    // Queue audio download
    if (audioFiles.length > 0) {
      downloadQueue.push(async () => {
        row.audio = await maybeDownloadFirstFile({
          files: audioFiles,
          label: "audio",
          baseName,
          overwrite,
        });
      });
    }

    rows.push(row);
  }

  // Start processing and wait for all downloads to complete
  if (downloadQueue.length > 0) {
    await downloadQueue.start();
  }

  const dbPath = getAssetFilePath(DB_JSON_ASSET);

  writeFileSync(dbPath, JSON.stringify(rows, null, 2));

  console.log(`Wrote ${dbPath}.`);
};

async function maybeDownloadFirstFile(args: {
  files: File[];
  label: string;
  baseName: string;
  overwrite: boolean;
}): Promise<string | undefined> {
  const { files, label, baseName, overwrite } = args;
  if (files.length === 0) {
    return;
  }
  const fullLabel = `${label} "${baseName}"`;
  const file = files[0];
  let url = "";
  let filename = "";

  if (file.type === "file" && file.file) {
    url = file.file.url;
    // Extract filename from URL or use a default
    const urlParts = url.split("/");
    const originalName = urlParts[urlParts.length - 1].split("?")[0];
    const extension = originalName.split(".").pop();
    if (extension) {
      filename = `${baseName}.${extension}`;
    } else {
      console.warn(
        `WARNING: Unable to determine file extension for ${fullLabel}.`,
      );
    }
  } else if (file.type === "external" && file.external) {
    console.warn(
      `WARNING: Unsupported image file type "external" for ${fullLabel}.`,
    );
  }

  if (url && filename) {
    try {
      await downloadFile({ url, filename, overwrite });
      return filename;
    } catch (error) {
      console.error(`Failed to download file for ${fullLabel}:`, error);
      throw error;
    }
  }
}

await run();
