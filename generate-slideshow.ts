import { type Database } from "./src/database-spec.ts";
import { ASSETS_DIR, DB_JSON_ASSET, getAssetFilePath } from "./src/assets.ts";
import { DatabaseHelper } from "./src/database-helper.ts";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "fs";
import { join } from "path";
import { execFileSync, spawn } from "child_process";
import { cpus } from "os";

// ============================================================================
// Types
// ============================================================================

interface ImageDimensions {
  width: number;
  height: number;
}

interface SubtitleSegment {
  /** Start time in seconds */
  startTime: number;
  /** End time in seconds */
  endTime: number;
  text: string;
  images: string[]; // filepaths of images for this subtitle
}

interface ImageLayout {
  filepath: string;
  x: number;
  y: number;
  scaledWidth: number;
  scaledHeight: number;
}

interface ElevenLabsWordTiming {
  text: string;
  start_time: number;
  end_time: number;
}

interface ElevenLabsSegmentTiming {
  words: ElevenLabsWordTiming[];
}

interface ElevenLabsTimingsData {
  segments: ElevenLabsSegmentTiming[];
}

interface WhisperTranscriptionSegment {
  timestamps: {
    from: string;
    to: string;
  };
  offsets: {
    from: number; // milliseconds
    to: number; // milliseconds
  };
  text: string;
}

interface WhisperTimingsData {
  transcription: WhisperTranscriptionSegment[];
}

interface LayoutOptions {
  frameWidth: number;
  frameHeight: number;
  subtitleAreaHeight: number;
  maxImagesPerRow: number;
  maxImages: number;
  rowGap: number;
}

// ============================================================================
// Utility Functions
// ============================================================================

function loadJson<T>(filename: string): T {
  const data = readFileSync(filename, "utf-8");
  return JSON.parse(data);
}

function loadDatabase(): Database {
  return loadJson(getAssetFilePath(DB_JSON_ASSET));
}

function getImageDimensions(filepath: string): ImageDimensions {
  const result = execFileSync("ffprobe", [
    "-loglevel",
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

function escapeDrawtext(text: string): string {
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "'\\\\\\''")
    .replace(/:/g, "\\:")
    .replace(/%/g, "\\%");
}

function wrapText(args: { text: string; maxCharsPerLine: number }): string[] {
  const words = args.text.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    if (currentLine.length + word.length + 1 <= args.maxCharsPerLine) {
      currentLine += (currentLine ? " " : "") + word;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

// ============================================================================
// Subtitle Building
// ============================================================================

function buildSubtitlesFromElevenLabsTimings(args: {
  timings: ElevenLabsTimingsData;
  wordMapping: Record<string, string[]>;
  dbHelper: DatabaseHelper;
}): SubtitleSegment[] {
  const { timings, wordMapping, dbHelper } = args;

  // Collect all words from all segments into a flat list
  interface WordWithTiming {
    text: string;
    startTime: number;
    endTime: number;
    isSegmentStart: boolean;
    imageFilepaths: string[];
  }

  const allWords: WordWithTiming[] = [];

  for (const segment of timings.segments) {
    let isFirst = true;
    for (const word of segment.words) {
      const text = word.text;
      const startTime = word.start_time;
      const endTime = word.end_time;

      // Check if this word has associated images (can be multiple for compound words)
      const imageFilepaths: string[] = [];
      const trimmed = text.trim().replace(/[,.]/g, "");
      const vocabWords = wordMapping[trimmed];
      if (vocabWords) {
        for (const vocabWord of vocabWords) {
          const row = dbHelper.wordHangulMap.get(vocabWord);
          if (row && row.picture?.type === "local-image") {
            imageFilepaths.push(join(ASSETS_DIR, row.picture.filename));
          }
        }
      }

      allWords.push({
        text,
        startTime,
        endTime,
        isSegmentStart: isFirst,
        imageFilepaths,
      });
      isFirst = false;
    }
  }

  // Group words into subtitle chunks based on sentence-ending punctuation
  const subtitleSegments: SubtitleSegment[] = [];
  let currentSubtitleText = "";
  let currentSubtitleStart: number | null = null;
  let currentSubtitleEnd = 0;
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

    // Collect images from this word (dedupe within subtitle)
    for (const filepath of word.imageFilepaths) {
      if (!currentSubtitleImages.includes(filepath)) {
        currentSubtitleImages.push(filepath);
      }
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

  return subtitleSegments;
}

/**
 * Pre-processes whisper transcription segments to remove duplicates and
 * hallucinations. Whisper sometimes produces many repeated segments with
 * the same text and tiny durations, which can cause ffmpeg to be extremely
 * slow due to the massive filter graph.
 */
function deduplicateWhisperSegments(
  segments: WhisperTranscriptionSegment[],
): WhisperTranscriptionSegment[] {
  const result: WhisperTranscriptionSegment[] = [];

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;

    // Skip segments with zero or negative duration
    if (segment.offsets.to <= segment.offsets.from) continue;

    const last = result[result.length - 1];

    if (last && last.text.trim() === text) {
      // Same text as previous segment - merge by extending the end time
      // Keep the earlier start time and later end time
      last.offsets = {
        from: Math.min(last.offsets.from, segment.offsets.from),
        to: Math.max(last.offsets.to, segment.offsets.to),
      };
      last.timestamps = {
        from: last.timestamps.from,
        to: segment.timestamps.to,
      };
    } else {
      // Different text - add as new segment
      result.push({
        ...segment,
        offsets: { ...segment.offsets },
        timestamps: { ...segment.timestamps },
      });
    }
  }

  // Filter out segments that are still very short (< 200ms) after merging
  // These are likely hallucination artifacts
  const minDurationMs = 200;
  const filtered = result.filter(
    (seg) => seg.offsets.to - seg.offsets.from >= minDurationMs,
  );

  console.log(
    `Whisper segments: ${segments.length} -> ${result.length} (merged) -> ${filtered.length} (filtered)`,
  );

  return filtered;
}

function buildSubtitlesFromWhisperTimings(args: {
  timings: WhisperTimingsData;
  wordMapping: Record<string, string[]>;
  dbHelper: DatabaseHelper;
}): SubtitleSegment[] {
  const { timings, wordMapping, dbHelper } = args;
  const subtitleSegments: SubtitleSegment[] = [];

  // Pre-process to remove duplicates and hallucinations
  const cleanedSegments = deduplicateWhisperSegments(timings.transcription);

  for (const segment of cleanedSegments) {
    const text = segment.text.trim();

    // Convert milliseconds to seconds
    const startTime = segment.offsets.from / 1000;
    const endTime = segment.offsets.to / 1000;

    // Collect images by matching words in the segment text
    const images: string[] = [];

    // Split text into words and look up each one
    const words = text.split(/\s+/);
    for (const word of words) {
      const trimmed = word.replace(/[,."'"!?[\]]/g, "");
      const vocabWords = wordMapping[trimmed];
      if (vocabWords) {
        for (const vocabWord of vocabWords) {
          const row = dbHelper.wordHangulMap.get(vocabWord);
          if (row && row.picture?.type === "local-image") {
            const filepath = join(ASSETS_DIR, row.picture.filename);
            if (!images.includes(filepath)) {
              images.push(filepath);
            }
          }
        }
      }
    }

    subtitleSegments.push({
      startTime,
      endTime,
      text,
      images,
    });
  }

  return subtitleSegments;
}

// ============================================================================
// Image Dimension Cache
// ============================================================================

function buildDimensionsCache(
  subtitles: SubtitleSegment[],
): Map<string, ImageDimensions> {
  const uniqueFilepaths = [...new Set(subtitles.flatMap((s) => s.images))];
  const cache = new Map<string, ImageDimensions>();

  for (const filepath of uniqueFilepaths) {
    cache.set(filepath, getImageDimensions(filepath));
  }

  return cache;
}

// ============================================================================
// Image Layout Calculation
// ============================================================================

function calculateImageLayout(args: {
  filepaths: string[];
  dimensionsCache: Map<string, ImageDimensions>;
  options: LayoutOptions;
}): ImageLayout[] {
  const { filepaths, dimensionsCache, options } = args;
  const {
    frameWidth,
    frameHeight,
    subtitleAreaHeight,
    maxImagesPerRow,
    maxImages,
    rowGap,
  } = options;

  const imageAreaHeight = frameHeight - subtitleAreaHeight;

  // Truncate to max images
  const images = filepaths.slice(0, maxImages);
  if (images.length === 0) return [];

  // Special case: single image that would be upscaled - use native size instead
  if (images.length === 1) {
    const filepath = images[0];
    const dims = dimensionsCache.get(filepath)!;

    if (
      dims.width <= frameWidth &&
      dims.height <= imageAreaHeight &&
      dims.height < imageAreaHeight
    ) {
      return [
        {
          filepath,
          x: (frameWidth - dims.width) / 2,
          y: (imageAreaHeight - dims.height) / 2,
          scaledWidth: dims.width,
          scaledHeight: dims.height,
        },
      ];
    }
  }

  // Determine row configuration
  const needsTwoRows = images.length > maxImagesPerRow;
  const row1Images = needsTwoRows
    ? images.slice(0, Math.ceil(images.length / 2))
    : images;
  const row2Images = needsTwoRows
    ? images.slice(Math.ceil(images.length / 2))
    : [];

  const rowHeight = needsTwoRows
    ? (imageAreaHeight - rowGap) / 2
    : imageAreaHeight;

  const layouts: ImageLayout[] = [];

  function layoutRow(
    rowImages: string[],
    rowY: number,
    targetHeight: number,
  ): ImageLayout[] {
    const rowLayouts: ImageLayout[] = [];

    const scaledImages = rowImages.map((filepath) => {
      const dims = dimensionsCache.get(filepath)!;
      const scale = targetHeight / dims.height;
      return {
        filepath,
        scaledWidth: dims.width * scale,
        scaledHeight: targetHeight,
      };
    });

    let totalWidth = scaledImages.reduce(
      (sum, img) => sum + img.scaledWidth,
      0,
    );

    if (totalWidth > frameWidth) {
      const shrinkFactor = frameWidth / totalWidth;
      for (const img of scaledImages) {
        img.scaledWidth *= shrinkFactor;
        img.scaledHeight *= shrinkFactor;
      }
      totalWidth = frameWidth;
    }

    let currentX = (frameWidth - totalWidth) / 2;

    for (const img of scaledImages) {
      rowLayouts.push({
        filepath: img.filepath,
        x: currentX,
        y: rowY + (targetHeight - img.scaledHeight) / 2,
        scaledWidth: img.scaledWidth,
        scaledHeight: img.scaledHeight,
      });
      currentX += img.scaledWidth;
    }

    return rowLayouts;
  }

  const row1Y = needsTwoRows ? 0 : (imageAreaHeight - rowHeight) / 2;
  layouts.push(...layoutRow(row1Images, row1Y, rowHeight));

  if (needsTwoRows) {
    const row2Y = rowHeight + rowGap;
    layouts.push(...layoutRow(row2Images, row2Y, rowHeight));
  }

  return layouts;
}

// ============================================================================
// Parallel Segment Rendering
// ============================================================================

interface VideoSegment {
  index: number;
  startTime: number;
  endTime: number;
  duration: number;
  subtitle: SubtitleSegment | null; // null for gap segments
  outputPath: string;
}

/**
 * Creates video segments including gaps between subtitles.
 * Each segment will be rendered independently and then concatenated.
 */
function createVideoSegments(args: {
  subtitles: SubtitleSegment[];
  totalDuration: number;
  tempDir: string;
}): VideoSegment[] {
  const { subtitles, totalDuration, tempDir } = args;
  const segments: VideoSegment[] = [];
  let index = 0;
  let currentTime = 0;

  for (const subtitle of subtitles) {
    // Add gap segment if there's a gap before this subtitle
    if (subtitle.startTime > currentTime + 0.01) {
      segments.push({
        index: index++,
        startTime: currentTime,
        endTime: subtitle.startTime,
        duration: subtitle.startTime - currentTime,
        subtitle: null,
        outputPath: join(
          tempDir,
          `segment_${String(index - 1).padStart(4, "0")}.mp4`,
        ),
      });
    }

    // Add subtitle segment
    segments.push({
      index: index++,
      startTime: subtitle.startTime,
      endTime: subtitle.endTime,
      duration: subtitle.endTime - subtitle.startTime,
      subtitle,
      outputPath: join(
        tempDir,
        `segment_${String(index - 1).padStart(4, "0")}.mp4`,
      ),
    });

    currentTime = subtitle.endTime;
  }

  // Add final gap if needed
  if (currentTime < totalDuration - 0.01) {
    segments.push({
      index: index++,
      startTime: currentTime,
      endTime: totalDuration,
      duration: totalDuration - currentTime,
      subtitle: null,
      outputPath: join(
        tempDir,
        `segment_${String(index - 1).padStart(4, "0")}.mp4`,
      ),
    });
  }

  return segments;
}

/**
 * Builds ffmpeg args to render a single video segment.
 */
function buildSegmentFFmpegArgs(args: {
  segment: VideoSegment;
  dimensionsCache: Map<string, ImageDimensions>;
  layoutOptions: LayoutOptions;
  fontPath: string;
  fontSize: number;
  lineHeight: number;
  maxCharsPerLine: number;
}): string[] {
  const {
    segment,
    dimensionsCache,
    layoutOptions,
    fontPath,
    fontSize,
    lineHeight,
    maxCharsPerLine,
  } = args;
  const { frameWidth, frameHeight } = layoutOptions;

  const inputArgs: string[] = ["-loglevel", "error"];

  // Black background for segment duration
  inputArgs.push(
    "-f",
    "lavfi",
    "-i",
    `color=c=black:s=${frameWidth}x${frameHeight}:d=${segment.duration}:r=30`,
  );

  // If this is a gap segment (no subtitle), just output black
  if (!segment.subtitle) {
    return [
      ...inputArgs,
      "-c:v",
      "libx264",
      "-preset",
      "ultrafast",
      "-y",
      segment.outputPath,
    ];
  }

  // Add images as inputs
  const images = segment.subtitle.images;
  for (const filepath of images) {
    inputArgs.push(
      "-loop",
      "1",
      "-t",
      String(segment.duration),
      "-i",
      filepath,
    );
  }

  // Build filter complex for images and text
  let filterComplex = "";
  let currentOutput = "0:v";
  let overlayIndex = 0;

  // Calculate image layout
  const layout = calculateImageLayout({
    filepaths: images,
    dimensionsCache,
    options: layoutOptions,
  });

  // Add image overlays (no enable condition needed - always on for this segment)
  for (const img of layout) {
    const inputIndex = images.indexOf(img.filepath) + 1;
    const outputLabel = `v${overlayIndex}`;

    const scaleW = Math.round(img.scaledWidth);
    const scaleH = Math.round(img.scaledHeight);
    const posX = Math.round(img.x);
    const posY = Math.round(img.y);

    filterComplex += `[${inputIndex}:v]scale=${scaleW}:${scaleH}[scaled${overlayIndex}];`;
    filterComplex += `[${currentOutput}][scaled${overlayIndex}]overlay=x=${posX}:y=${posY}[${outputLabel}];`;

    currentOutput = outputLabel;
    overlayIndex++;
  }

  // Add subtitle text
  const lines = wrapText({ text: segment.subtitle.text, maxCharsPerLine });
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const escapedText = escapeDrawtext(lines[lineIdx]);
    const isLast = lineIdx === lines.length - 1;
    const outputLabel = isLast ? "vout" : `sub${lineIdx}`;
    const yPos = `h-${60 + (lines.length - 1 - lineIdx) * lineHeight}`;

    filterComplex += `[${currentOutput}]drawtext=text='${escapedText}':fontfile='${fontPath}':fontsize=${fontSize}:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=${yPos}[${outputLabel}]`;

    if (!isLast) {
      filterComplex += ";";
    }
    currentOutput = outputLabel;
  }

  // Handle case with images but text creates [vout]
  // or no images and we need to add text to base
  if (layout.length === 0 && lines.length > 0) {
    // No images, just add text to base video
    filterComplex = "";
    currentOutput = "0:v";
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const escapedText = escapeDrawtext(lines[lineIdx]);
      const isLast = lineIdx === lines.length - 1;
      const outputLabel = isLast ? "vout" : `sub${lineIdx}`;
      const yPos = `h-${60 + (lines.length - 1 - lineIdx) * lineHeight}`;

      filterComplex += `[${currentOutput}]drawtext=text='${escapedText}':fontfile='${fontPath}':fontsize=${fontSize}:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=${yPos}[${outputLabel}]`;

      if (!isLast) {
        filterComplex += ";";
      }
      currentOutput = outputLabel;
    }
  }

  const outputArgs = [
    "-filter_complex",
    filterComplex,
    "-map",
    "[vout]",
    "-c:v",
    "libx264",
    "-preset",
    "ultrafast",
    "-y",
    segment.outputPath,
  ];

  return [...inputArgs, ...outputArgs];
}

/**
 * Renders a single segment using ffmpeg.
 * Returns a promise that resolves when complete.
 */
function renderSegment(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn("ffmpeg", args, { stdio: "pipe" });
    let stderr = "";

    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`));
      }
    });

    proc.on("error", reject);
  });
}

/**
 * Renders all segments in parallel with a concurrency limit.
 */
async function renderAllSegments(args: {
  segments: VideoSegment[];
  dimensionsCache: Map<string, ImageDimensions>;
  layoutOptions: LayoutOptions;
  fontPath: string;
  fontSize: number;
  lineHeight: number;
  maxCharsPerLine: number;
  concurrency: number;
}): Promise<void> {
  const {
    segments,
    dimensionsCache,
    layoutOptions,
    fontPath,
    fontSize,
    lineHeight,
    maxCharsPerLine,
    concurrency,
  } = args;

  console.log(
    `Rendering ${segments.length} segments with concurrency ${concurrency}...`,
  );

  let completed = 0;
  const total = segments.length;

  // Process segments in batches
  for (let i = 0; i < segments.length; i += concurrency) {
    const batch = segments.slice(i, i + concurrency);
    const promises = batch.map((segment) => {
      const ffmpegArgs = buildSegmentFFmpegArgs({
        segment,
        dimensionsCache,
        layoutOptions,
        fontPath,
        fontSize,
        lineHeight,
        maxCharsPerLine,
      });

      return renderSegment(ffmpegArgs).then(() => {
        completed++;
        process.stdout.write(`\rRendered ${completed}/${total} segments`);
      });
    });

    await Promise.all(promises);
  }

  console.log(); // newline after progress
}

/**
 * Concatenates all segment videos and adds the audio track.
 */
function concatenateSegments(args: {
  segments: VideoSegment[];
  audioPath: string;
  outputPath: string;
  tempDir: string;
}): void {
  const { segments, audioPath, outputPath, tempDir } = args;

  // Create concat file (use basename since concat file is in same directory)
  const concatFilePath = join(tempDir, "concat.txt");
  const concatContent = segments
    .map((seg) => `file '${seg.outputPath.split("/").pop()}'`)
    .join("\n");
  writeFileSync(concatFilePath, concatContent);

  console.log("Concatenating segments and adding audio...");

  // Concatenate videos and add audio
  execFileSync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFilePath,
      "-i",
      audioPath,
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-shortest",
      "-y",
      outputPath,
    ],
    { stdio: "inherit" },
  );
}

/**
 * Cleans up temporary segment files.
 */
function cleanupTempFiles(tempDir: string, segments: VideoSegment[]): void {
  for (const segment of segments) {
    if (existsSync(segment.outputPath)) {
      unlinkSync(segment.outputPath);
    }
  }
  const concatFile = join(tempDir, "concat.txt");
  if (existsSync(concatFile)) {
    unlinkSync(concatFile);
  }
  // Try to remove temp directory (will fail if not empty, which is fine)
  try {
    unlinkSync(tempDir);
  } catch {
    // Directory not empty or doesn't exist, ignore
  }
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const mp3Path = process.argv[2];
  if (!mp3Path || !mp3Path.endsWith(".mp3")) {
    console.error("Usage: npx tsx generate-slideshow.ts <mp3-file>");
    console.error(
      "Example: npx tsx generate-slideshow.ts stories/friend-and-trip.mp3",
    );
    process.exit(1);
  }
  const baseName = mp3Path.slice(0, -4); // Remove .mp3 extension

  // Load resources
  const dbRows = loadDatabase();
  const dbHelper = new DatabaseHelper(dbRows);
  const wordMapping = loadJson<Record<string, string[]>>(
    `${baseName}.mapping.json`,
  );

  // Detect timing file format and build subtitles accordingly
  const elevenLabsPath = `${baseName}.elevenlabs.json`;
  const whisperPath = `${baseName}.whisper.json`;

  let subtitles: SubtitleSegment[];
  let totalDuration: number;

  if (existsSync(elevenLabsPath)) {
    console.log(`Using ElevenLabs timing data: ${elevenLabsPath}`);
    const timings = loadJson<ElevenLabsTimingsData>(elevenLabsPath);

    subtitles = buildSubtitlesFromElevenLabsTimings({
      timings,
      wordMapping,
      dbHelper,
    });

    // Calculate total duration from ElevenLabs data
    const lastSegment = timings.segments[timings.segments.length - 1];
    const lastWord = lastSegment.words[lastSegment.words.length - 1];
    totalDuration = Math.ceil(lastWord.end_time) + 1;
  } else if (existsSync(whisperPath)) {
    console.log(`Using Whisper timing data: ${whisperPath}`);
    const timings = loadJson<WhisperTimingsData>(whisperPath);

    subtitles = buildSubtitlesFromWhisperTimings({
      timings,
      wordMapping,
      dbHelper,
    });

    // Calculate total duration from Whisper data (offsets are in milliseconds)
    const lastSegment = timings.transcription[timings.transcription.length - 1];
    totalDuration = Math.ceil(lastSegment.offsets.to / 1000) + 1;
  } else {
    console.error(
      `Error: No timing file found. Expected one of:\n  ${elevenLabsPath}\n  ${whisperPath}`,
    );
    process.exit(1);
  }

  // Build dimensions cache
  const dimensionsCache = buildDimensionsCache(subtitles);

  // Layout options
  const layoutOptions: LayoutOptions = {
    frameWidth: 640,
    frameHeight: 480,
    subtitleAreaHeight: 80,
    maxImagesPerRow: 5,
    maxImages: 10,
    rowGap: 10,
  };

  // Rendering options
  const audioPath = `${baseName}.mp3`;
  const outputPath = `${baseName}.mp4`;
  const fontPath = "/System/Library/Fonts/AppleSDGothicNeo.ttc";
  const fontSize = 24;
  const lineHeight = 30;
  const maxCharsPerLine = 30;

  // Create temp directory for segments
  const tempDir = `${baseName}_segments`;
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir);
  }

  // Create video segments (including gaps)
  const videoSegments = createVideoSegments({
    subtitles,
    totalDuration,
    tempDir,
  });

  console.log(`Created ${videoSegments.length} video segments`);

  // Render all segments in parallel
  const concurrency = Math.max(1, cpus().length - 1); // Leave one CPU free

  await renderAllSegments({
    segments: videoSegments,
    dimensionsCache,
    layoutOptions,
    fontPath,
    fontSize,
    lineHeight,
    maxCharsPerLine,
    concurrency,
  });

  // Concatenate and add audio
  concatenateSegments({
    segments: videoSegments,
    audioPath,
    outputPath,
    tempDir,
  });

  // Clean up temp files
  console.log("Cleaning up temporary files...");
  cleanupTempFiles(tempDir, videoSegments);

  console.log(`Done! Output: ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
