import { Client } from "@notionhq/client";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";
import { type DatabaseRow } from "./src/database-spec.ts";
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

const DB_JSON_FILENAME = "src/database.json";

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
    let category = "";
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

    const row: DatabaseRow = {
      name,
      hangul,
      url,
      imageUrl,
      category,
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

  // Download assets
  const rows: DatabaseRow[] = [];
  for (let i = 0; i < entries.length; i++) {
    const { row, imageFiles, audioFiles } = entries[i];
    // Use sanitized name based on row name
    const baseName = row.name.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    row.image = await maybeDownloadFirstFile(imageFiles, "image", baseName);
    row.audio = await maybeDownloadFirstFile(audioFiles, "audio", baseName);
    rows.push(row);
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
