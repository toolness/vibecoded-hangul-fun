import { Client } from "@notionhq/client";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
import Queue from "queue";
import { type DatabaseRow, type WordPicture } from "./src/database-spec.ts";
import { ASSETS_DIR } from "./src/assets.ts";

dotenv.config();

const NOTION_API_KEY = process.env.NOTION_API_KEY;

if (!NOTION_API_KEY) {
  throw new Error("Please define NOTION_API_KEY!");
}

const NOTION_DB_ID = process.env.NOTION_DB_ID;

if (!NOTION_DB_ID) {
  throw new Error("Please define NOTION_DB_ID!");
}

const DB_JSON_FILENAME = "src/assets/database/database.json";

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
};

async function downloadDatabase(
  notion: Client,
  id: string,
): Promise<DatabaseEntry[]> {
  const response = await notion.databases.query({
    database_id: id,
  });

  const entries: DatabaseEntry[] = [];

  for (const page of response.results) {
    if (!("properties" in page)) {
      continue;
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

    // Convert to WordPicture format - prioritize emojis, then imageUrl
    let picture: WordPicture | undefined;
    if (emojis) {
      picture = {
        type: "emojis",
        emojis,
      };
    } else if (imageUrl) {
      picture = {
        type: "remote-image",
        url: imageUrl,
      };
    }

    const row: DatabaseRow = {
      id: page.id,
      name,
      hangul,
      isTranslation,
      url,
      picture,
      category,
      notes,
      minimalPairs: minimalPairs.length > 0 ? minimalPairs : undefined,
    };

    entries.push({
      row,
      imageFiles,
      audioFiles,
    });
  }

  return entries;
}

async function downloadFile(url: string, filename: string): Promise<void> {
  const filepath = join(ASSETS_DIR, filename);
  if (existsSync(filepath)) {
    // For now, don't download files that already exist.
    // In the future we can use last-modified timestamps or something
    // to make this smarter.
    console.log(`Skipping ${filename} because it already exists.`);
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
  const notion = new Client({ auth: NOTION_API_KEY });

  console.log("Downloading database...");

  const entries = await downloadDatabase(notion, NOTION_DB_ID);

  // Ensure assets directory exists
  if (!existsSync(ASSETS_DIR)) {
    mkdirSync(ASSETS_DIR, { recursive: true });
  }

  // Create a queue with concurrency of 5
  const downloadQueue = new Queue({ concurrency: 5, autostart: false });

  // Prepare rows and queue all downloads
  const rows: DatabaseRow[] = [];

  for (const { row, imageFiles, audioFiles } of entries) {
    // Use sanitized name based on row name
    const baseName = row.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();

    // Queue image download
    if (imageFiles.length > 0) {
      downloadQueue.push(async () => {
        const filename = await maybeDownloadFirstFile(
          imageFiles,
          "image",
          baseName,
        );
        if (filename) {
          row.picture = {
            type: "local-image",
            filename,
          };
        }
      });
    }

    // Queue audio download
    if (audioFiles.length > 0) {
      downloadQueue.push(async () => {
        row.audio = await maybeDownloadFirstFile(audioFiles, "audio", baseName);
      });
    }

    rows.push(row);
  }

  // Start processing and wait for all downloads to complete
  if (downloadQueue.length > 0) {
    await downloadQueue.start();
  }

  writeFileSync(DB_JSON_FILENAME, JSON.stringify(rows, null, 2));

  console.log(`Wrote ${DB_JSON_FILENAME}.`);
};

async function maybeDownloadFirstFile(
  files: File[],
  label: string,
  baseName: string,
): Promise<string | undefined> {
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
      await downloadFile(url, filename);
      return filename;
    } catch (error) {
      console.error(`Failed to download file for ${fullLabel}:`, error);
      throw error;
    }
  }
}

await run();
