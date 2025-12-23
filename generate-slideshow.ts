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

interface SubtitleSegment {
  startTime: number;
  endTime: number;
  text: string;
}

const imageSegments: ImageSegment[] = [];
const subtitleSegments: SubtitleSegment[] = [];

for (const segment of timings.segments) {
  const segmentText: string = segment.text;
  const segmentStartTime: number = segment.start_time;
  const segmentEndTime: number = segment.end_time;
  subtitleSegments.push({
    startTime: segmentStartTime,
    endTime: segmentEndTime,
    text: segmentText,
  });
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
        imageSegments.push({ startTime, endTime, filepath });
      }
    }
  }
}

// Deduplicate images by filepath, keeping the unique file paths
const uniqueFilepaths = [...new Set(imageSegments.map((s) => s.filepath))];

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

// Escape text for ffmpeg drawtext filter
function escapeDrawtext(text: string): string {
  // Escape special characters for drawtext: \ ' : %
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "'\\\\\\''")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%");
}

// Wrap text to fit within a certain character limit per line
function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= maxCharsPerLine) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

// Korean font path for macOS
const koreanFontPath = "/System/Library/Fonts/AppleSDGothicNeo.ttc";

// Build overlay chain for images
let filterComplex = "";
let currentOutput = "0:v";

imageSegments.forEach((seg, i) => {
  const inputIndex = filepathToInputIndex.get(seg.filepath)!;
  const outputLabel = `v${i}`;
  // Overlay centered: x=(W-w)/2, y=(H-h)/2
  // Enable only during the segment time
  filterComplex += `[${currentOutput}][${inputIndex}:v]overlay=x=(W-w)/2:y=(H-h)/2:enable='between(t,${seg.startTime},${seg.endTime})'[${outputLabel}];`;
  currentOutput = outputLabel;
});

// Add drawtext filters for subtitles (with wrapping and Korean font)
const fontSize = 24;
const lineHeight = 30;
const maxCharsPerLine = 30;

// Build all subtitle draw operations
interface SubtitleDraw {
  text: string;
  startTime: number;
  endTime: number;
  yOffset: number; // 0 for top line, 1 for second line, etc.
  totalLines: number;
}

const subtitleDraws: SubtitleDraw[] = [];
for (const seg of subtitleSegments) {
  const lines = wrapText(seg.text, maxCharsPerLine);
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    subtitleDraws.push({
      text: lines[lineIdx],
      startTime: seg.startTime,
      endTime: seg.endTime,
      yOffset: lineIdx,
      totalLines: lines.length,
    });
  }
}

subtitleDraws.forEach((draw, i) => {
  const escapedText = escapeDrawtext(draw.text);
  const outputLabel = i === subtitleDraws.length - 1 ? "vout" : `sub${i}`;
  // Position from bottom: for 2 lines, first line at h-90, second at h-60
  const yPos = `h-${60 + (draw.totalLines - 1 - draw.yOffset) * lineHeight}`;
  filterComplex += `[${currentOutput}]drawtext=text='${escapedText}':fontfile='${koreanFontPath}':fontsize=${fontSize}:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=${yPos}:enable='between(t,${draw.startTime},${draw.endTime})'[${outputLabel}]`;
  if (i < subtitleDraws.length - 1) {
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
