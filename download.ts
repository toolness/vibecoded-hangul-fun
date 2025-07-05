import { Client } from "@notionhq/client";

import dotenv from "dotenv";

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
 * Represents a row describing an English/romanized word,
 * its Hangul equivalent, and any additional metadata.
 */
interface DatabaseRow {
    /** The English/romanized text. */
    name: string

    /** The Hangul equivalent of the English/romanized text. */
    hangul: string

    /**
     * URL for where the user can learn more about the entity
     * being described. It may be an empty string.
     */
    url: string
}

async function downloadDatabase(notion: Client, id: string): Promise<DatabaseRow[]> {
    // TODO:
    // 
    // 1. Use the Notion API to download the database specified by `id`.
    //
    // 2. Verify that it has the columns "Name", "Hangul", and "URL".
    //
    // 3. Convert each column into a `DatabaseRow` object and return
    //    the result.

    return []
}

const run = async () => {
    const notion = new Client({ auth: NOTION_API_KEY });

    console.log("Downloading database...");

    const rows = await downloadDatabase(notion, NOTION_DB_ID);
    
    // TODO: Write `rows` as JSON to `DB_JSON_FILENAME`.

    console.log(`Wrote ${DB_JSON_FILENAME}.`);
};

await run();
