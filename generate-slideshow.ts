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

interface ImageDimensions {
  width: number;
  height: number;
}

function getImageDimensions(filepath: string): ImageDimensions {
  const result = execFileSync("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "json",
    filepath,
  ]);
  const data = JSON.parse(result.toString());
  return {
    width: data.streams[0].width,
    height: data.streams[0].height,
  };
}

const dbRows = loadDatabase();

const dbHelper = new DatabaseHelper(dbRows);

const wordMapping = loadJson<Record<string, string | null>>(
  "friend-and-trip-mapping.json",
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const timings = loadJson<any>("friend-and-trip-timings.json");

interface SubtitleSegment {
  startTime: number;
  endTime: number;
  text: string;
  images: string[]; // filepaths of images for this subtitle
}

const subtitleSegments: SubtitleSegment[] = [];

// Collect all words from all segments into a flat list
interface WordWithTiming {
  text: string;
  startTime: number;
  endTime: number;
  isSegmentStart: boolean;
  imageFilepath: string | null; // image associated with this word, if any
}
const allWords: WordWithTiming[] = [];

for (const segment of timings.segments) {
  let isFirst = true;
  for (const word of segment.words) {
    const text: string = word.text;
    const startTime: number = word.start_time;
    const endTime: number = word.end_time;

    // Check if this word has an associated image
    let imageFilepath: string | null = null;
    const trimmed = text.trim().replace(/[,.]/g, "");
    const vocabWord = wordMapping[trimmed];
    if (vocabWord) {
      const row = dbHelper.wordHangulMap.get(vocabWord);
      if (row && row.picture?.type === "local-image") {
        imageFilepath = join(ASSETS_DIR, row.picture.filename);
      }
    }

    allWords.push({
      text,
      startTime,
      endTime,
      isSegmentStart: isFirst,
      imageFilepath,
    });
    isFirst = false;
  }
}

// Group words into subtitle chunks based on sentence-ending punctuation
// A subtitle ends when we hit a word ending with . ! ? or ]
let currentSubtitleText = "";
let currentSubtitleStart: number | null = null;
let currentSubtitleEnd: number = 0;
let currentSubtitleImages: string[] = [];

for (const word of allWords) {
  const text = word.text;

  // Skip pure whitespace tokens but track them for spacing
  if (text.trim() === "") {
    if (currentSubtitleText) {
      currentSubtitleText += " ";
    }
    continue;
  }

  // Start a new subtitle if needed
  if (currentSubtitleStart === null) {
    currentSubtitleStart = word.startTime;
  }

  // Add space before segment start if we're continuing a subtitle
  if (
    word.isSegmentStart &&
    currentSubtitleText &&
    !currentSubtitleText.endsWith(" ")
  ) {
    currentSubtitleText += " ";
  }

  currentSubtitleText += text;
  currentSubtitleEnd = word.endTime;

  // Collect image if this word has one (dedupe within subtitle)
  if (
    word.imageFilepath &&
    !currentSubtitleImages.includes(word.imageFilepath)
  ) {
    currentSubtitleImages.push(word.imageFilepath);
  }

  // Check if this word ends a sentence (ends with . ! ? or ])
  const endsWithPunctuation = /[.!?\]]$/.test(text.trim());

  if (endsWithPunctuation && currentSubtitleText.trim()) {
    subtitleSegments.push({
      startTime: currentSubtitleStart,
      endTime: currentSubtitleEnd,
      text: currentSubtitleText.trim(),
      images: currentSubtitleImages,
    });
    currentSubtitleText = "";
    currentSubtitleStart = null;
    currentSubtitleImages = [];
  }
}

// Don't forget any remaining text
if (currentSubtitleText.trim() && currentSubtitleStart !== null) {
  subtitleSegments.push({
    startTime: currentSubtitleStart,
    endTime: currentSubtitleEnd,
    text: currentSubtitleText.trim(),
    images: currentSubtitleImages,
  });
}

// Deduplicate images by filepath, keeping the unique file paths
const uniqueFilepaths = [...new Set(subtitleSegments.flatMap((s) => s.images))];

// Get dimensions for all unique images
const imageDimensions = new Map<string, ImageDimensions>();
for (const filepath of uniqueFilepaths) {
  imageDimensions.set(filepath, getImageDimensions(filepath));
}

// Layout constants
const FRAME_WIDTH = 640;
const FRAME_HEIGHT = 480;
const SUBTITLE_AREA_HEIGHT = 80; // Reserve space at bottom for subtitles
const IMAGE_AREA_HEIGHT = FRAME_HEIGHT - SUBTITLE_AREA_HEIGHT;
const MAX_IMAGES_PER_ROW = 5;
const MAX_IMAGES = 10;
const ROW_GAP = 10; // Gap between rows

// Calculate layout for a set of images
interface ImageLayout {
  filepath: string;
  x: number;
  y: number;
  scaledWidth: number;
  scaledHeight: number;
}

function calculateImageLayout(filepaths: string[]): ImageLayout[] {
  // Truncate to max images
  const images = filepaths.slice(0, MAX_IMAGES);
  if (images.length === 0) return [];

  // Determine row configuration
  const needsTwoRows = images.length > MAX_IMAGES_PER_ROW;
  const row1Images = needsTwoRows
    ? images.slice(0, Math.ceil(images.length / 2))
    : images;
  const row2Images = needsTwoRows
    ? images.slice(Math.ceil(images.length / 2))
    : [];

  // Calculate uniform height for each row
  const rowHeight = needsTwoRows
    ? (IMAGE_AREA_HEIGHT - ROW_GAP) / 2
    : IMAGE_AREA_HEIGHT;

  const layouts: ImageLayout[] = [];

  // Helper to layout a single row
  function layoutRow(
    rowImages: string[],
    rowY: number,
    targetHeight: number,
  ): ImageLayout[] {
    const rowLayouts: ImageLayout[] = [];

    // Scale each image to target height and calculate total width
    const scaledImages = rowImages.map((filepath) => {
      const dims = imageDimensions.get(filepath)!;
      const scale = targetHeight / dims.height;
      return {
        filepath,
        scaledWidth: dims.width * scale,
        scaledHeight: targetHeight,
      };
    });

    // Calculate total width and check if we need to shrink
    let totalWidth = scaledImages.reduce(
      (sum, img) => sum + img.scaledWidth,
      0,
    );

    // If too wide, scale down proportionally
    if (totalWidth > FRAME_WIDTH) {
      const shrinkFactor = FRAME_WIDTH / totalWidth;
      for (const img of scaledImages) {
        img.scaledWidth *= shrinkFactor;
        img.scaledHeight *= shrinkFactor;
      }
      totalWidth = FRAME_WIDTH;
    }

    // Center the row horizontally
    let currentX = (FRAME_WIDTH - totalWidth) / 2;

    for (const img of scaledImages) {
      rowLayouts.push({
        filepath: img.filepath,
        x: currentX,
        y: rowY + (targetHeight - img.scaledHeight) / 2, // Center vertically in row
        scaledWidth: img.scaledWidth,
        scaledHeight: img.scaledHeight,
      });
      currentX += img.scaledWidth;
    }

    return rowLayouts;
  }

  // Layout row 1
  const row1Y = needsTwoRows ? 0 : (IMAGE_AREA_HEIGHT - rowHeight) / 2;
  layouts.push(...layoutRow(row1Images, row1Y, rowHeight));

  // Layout row 2 if needed
  if (needsTwoRows) {
    const row2Y = rowHeight + ROW_GAP;
    layouts.push(...layoutRow(row2Images, row2Y, rowHeight));
  }

  return layouts;
}

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
// For each subtitle, we show all its images with calculated layout positions
let filterComplex = "";
let currentOutput = "0:v";
let overlayIndex = 0;

for (const subtitle of subtitleSegments) {
  const layout = calculateImageLayout(subtitle.images);

  for (const img of layout) {
    const inputIndex = filepathToInputIndex.get(img.filepath)!;
    const outputLabel = `v${overlayIndex}`;

    // Scale the image to the calculated size, then overlay at the calculated position
    // Use scale2ref to scale relative to the input, or just scale directly
    const scaleW = Math.round(img.scaledWidth);
    const scaleH = Math.round(img.scaledHeight);
    const posX = Math.round(img.x);
    const posY = Math.round(img.y);

    // Create a scaled version of the image and overlay it
    filterComplex += `[${inputIndex}:v]scale=${scaleW}:${scaleH}[scaled${overlayIndex}];`;
    filterComplex += `[${currentOutput}][scaled${overlayIndex}]overlay=x=${posX}:y=${posY}:enable='between(t,${subtitle.startTime},${subtitle.endTime})'[${outputLabel}];`;

    currentOutput = outputLabel;
    overlayIndex++;
  }
}

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
