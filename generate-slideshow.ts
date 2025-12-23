import { type Database } from "./src/database-spec.ts";
import { ASSETS_DIR, DB_JSON_ASSET, getAssetFilePath } from "./src/assets.ts";
import { DatabaseHelper } from "./src/database-helper.ts";
import { readFileSync } from "fs";
import { join } from "path";
import { execFileSync } from "child_process";

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

interface ImageSegment {
  startTime: number;
  endTime: number;
  filepath: string;
}

const segments: ImageSegment[] = [];

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
        segments.push({ startTime, endTime, filepath });
      }
    }
  }
}

// Deduplicate images by filepath, keeping the unique file paths
const uniqueFilepaths = [...new Set(segments.map((s) => s.filepath))];

// Find total duration from the last segment end time
const lastSegment = timings.segments[timings.segments.length - 1];
const lastWord = lastSegment.words[lastSegment.words.length - 1];
const totalDuration: number = Math.ceil(lastWord.end_time) + 1;

// Build ffmpeg command
// Input 0: black background
// Input 1..N: images (one per unique filepath)
// Last input: audio

const inputArgs: string[] = [];

// Black background
inputArgs.push(
  "-f",
  "lavfi",
  "-i",
  `color=c=black:s=640x480:d=${totalDuration}`,
);

// Add each unique image as an input
for (const filepath of uniqueFilepaths) {
  inputArgs.push("-loop", "1", "-t", String(totalDuration), "-i", filepath);
}

// Audio input
const audioPath = "friend-and-trip.mp3";
inputArgs.push("-i", audioPath);

// Build the filter complex
// For each segment, overlay the corresponding image at the right time
const filepathToInputIndex = new Map<string, number>();
uniqueFilepaths.forEach((fp, i) => {
  filepathToInputIndex.set(fp, i + 1); // +1 because input 0 is the background
});

// Build overlay chain
let filterComplex = "";
let currentOutput = "0:v";

segments.forEach((seg, i) => {
  const inputIndex = filepathToInputIndex.get(seg.filepath)!;
  const outputLabel = i === segments.length - 1 ? "vout" : `v${i}`;
  // Overlay centered: x=(W-w)/2, y=(H-h)/2
  // Enable only during the segment time
  filterComplex += `[${currentOutput}][${inputIndex}:v]overlay=x=(W-w)/2:y=(H-h)/2:enable='between(t,${seg.startTime},${seg.endTime})'[${outputLabel}]`;
  if (i < segments.length - 1) {
    filterComplex += ";";
  }
  currentOutput = outputLabel;
});

const audioInputIndex = uniqueFilepaths.length + 1;

const outputArgs = [
  "-filter_complex",
  filterComplex,
  "-map",
  "[vout]",
  "-map",
  `${audioInputIndex}:a`,
  "-c:v",
  "libx264",
  "-c:a",
  "aac",
  "-shortest",
  "-y",
  "friend-and-trip.mp4",
];

const ffmpegArgs = [...inputArgs, ...outputArgs];

console.log("Running ffmpeg...");
console.log("ffmpeg", ffmpegArgs.join(" "));

execFileSync("ffmpeg", ffmpegArgs, { stdio: "inherit" });

console.log("Done! Output: friend-and-trip.mp4");
