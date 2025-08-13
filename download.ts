import { Client } from "@notionhq/client";
import { writeFileSync } from "fs";
import dotenv from "dotenv";
import { type DatabaseRow } from "./src/database-spec.ts";

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

async function downloadDatabase(
  notion: Client,
  id: string,
): Promise<DatabaseRow[]> {
  const response = await notion.databases.query({
    database_id: id,
  });

  const rows: DatabaseRow[] = [];

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

    rows.push({
      name,
      hangul,
      url,
      imageUrl,
      category,
    });
  }

  return rows;
}

const run = async () => {
  const notion = new Client({ auth: NOTION_API_KEY });

  console.log("Downloading database...");

  const rows = await downloadDatabase(notion, NOTION_DB_ID);

  writeFileSync(DB_JSON_FILENAME, JSON.stringify(rows, null, 2));

  console.log(`Wrote ${DB_JSON_FILENAME}.`);
};

await run();
