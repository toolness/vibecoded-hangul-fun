import { type Database } from "./src/database-spec.ts";
import { ASSETS_DIR, DB_JSON_ASSET, getAssetFilePath } from "./src/assets.ts";
import { DatabaseHelper } from "./src/database-helper.ts";
import { readFileSync } from "fs";
import { join } from "path";

function loadJson<T>(filename: string): T {
  const data = readFileSync(filename, "utf-8");
  return JSON.parse(data);
}

function loadDatabase(): Database {
  return loadJson(getAssetFilePath(DB_JSON_ASSET));
}

const dbRows = loadDatabase();

const dbHelper = new DatabaseHelper(dbRows);

const wordMapping = loadJson<Record<string, string | null>>(
  "friend-and-trip-mapping.json",
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const timings = loadJson<any>("friend-and-trip-timings.json");

for (const segment of timings.segments) {
  for (const word of segment.words) {
    const text: string = word.text;
    const startTime: number = word.start_time;
    const endTime: number = word.end_time;
    const trimmed = text.trim().replace(/[,.]/g, "");
    const vocabWord = wordMapping[trimmed];
    if (vocabWord) {
      const row = dbHelper.wordHangulMap.get(vocabWord);
      if (row && row.picture?.type === "local-image") {
        const filepath = join(ASSETS_DIR, row.picture.filename);
        // TODO: Show the picture at "filepath" between startTime and endTime seconds.
        console.log(startTime, endTime, filepath);
      }
    }
  }
}
