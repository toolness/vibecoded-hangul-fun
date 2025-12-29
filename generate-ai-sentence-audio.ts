import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { readFileSync } from "fs";
import Queue from "queue";
import { parseArgs } from "util";

import { ensureEnvironmentVar } from "./src/cli/cli-util.ts";
import type { AiGeneratedFillInTheBlankSentence } from "./src/dynamic-cards/aiGeneratedFillInTheBlank.ts";

dotenv.config();

const CLI_ARGS = {
  limit: {
    type: "string",
    short: "l",
  },
} as const;

const S3_PREFIX = "ai-generated-sentences/";

// "Chungman" voice.
const VOICE_ID = "8MwPLtBplylvbrksiBOC";

async function listExistingAudioFiles(s3Client: S3Client, bucket: string) {
  const existingFiles = new Set<string>();

  let continuationToken: string | undefined;
  do {
    const response = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: S3_PREFIX,
        ContinuationToken: continuationToken,
      }),
    );

    for (const obj of response.Contents ?? []) {
      if (obj.Key) {
        // Extract the filename without the prefix
        const filename = obj.Key.slice(S3_PREFIX.length);
        existingFiles.add(filename);
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return existingFiles;
}

async function generateAndUploadAudio(args: {
  elevenlabs: ElevenLabsClient;
  s3Client: S3Client;
  bucket: string;
  sentence: AiGeneratedFillInTheBlankSentence;
}) {
  const { elevenlabs, s3Client, bucket, sentence } = args;
  const filename = `${sentence.slug}.mp3`;
  const s3Key = `${S3_PREFIX}${filename}`;

  console.log(`Generating audio for "${sentence.sentence}"...`);

  const audio = await elevenlabs.textToSpeech.convert(VOICE_ID, {
    text: sentence.sentence,
    outputFormat: "mp3_44100_96",
    modelId: "eleven_turbo_v2_5",
    languageCode: "ko",
    voiceSettings: {
      speed: 0.7,
    },
    applyTextNormalization: "auto",
  });

  // Collect the stream into a buffer
  const chunks: Uint8Array[] = [];
  for await (const chunk of audio) {
    chunks.push(chunk);
  }
  const audioBuffer = Buffer.concat(chunks);

  console.log(`Uploading ${filename} to S3...`);

  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: s3Key,
      Body: audioBuffer,
      ContentType: "audio/mpeg",
    }),
  );

  console.log(`Uploaded ${filename}`);
}

async function main() {
  const args = parseArgs({ options: CLI_ARGS });
  const limit = args.values.limit ? parseInt(args.values.limit, 10) : undefined;

  if (limit !== undefined && (isNaN(limit) || limit < 1)) {
    console.error("Error: --limit must be a positive integer");
    process.exit(1);
  }

  const AWS_ACCESS_KEY = ensureEnvironmentVar("AWS_ACCESS_KEY");
  const AWS_SECRET_ACCESS_KEY = ensureEnvironmentVar("AWS_SECRET_ACCESS_KEY");
  const AWS_BUCKET = ensureEnvironmentVar("AWS_BUCKET");
  const AWS_BUCKET_REGION = ensureEnvironmentVar("AWS_BUCKET_REGION");

  const elevenlabs = new ElevenLabsClient({
    apiKey: ensureEnvironmentVar("ELEVENLABS_API_KEY"),
  });

  const s3Client = new S3Client({
    region: AWS_BUCKET_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY,
      secretAccessKey: AWS_SECRET_ACCESS_KEY,
    },
  });

  console.log("Loading sentences from ai-generated-sentences.json...");
  const sentences: AiGeneratedFillInTheBlankSentence[] = JSON.parse(
    readFileSync("src/assets/ai-generated-sentences.json", "utf-8"),
  );
  console.log(`Found ${sentences.length} sentences.`);

  console.log(
    `Listing existing audio files in s3://${AWS_BUCKET}/${S3_PREFIX}...`,
  );
  const existingFiles = await listExistingAudioFiles(s3Client, AWS_BUCKET);
  console.log(`Found ${existingFiles.size} existing audio files.`);

  // Find sentences that don't have audio yet
  const sentencesNeedingAudio = sentences.filter(
    (sentence) => !existingFiles.has(`${sentence.slug}.mp3`),
  );
  console.log(
    `${sentencesNeedingAudio.length} sentences need audio generation.`,
  );

  if (sentencesNeedingAudio.length === 0) {
    console.log("All sentences already have audio. Nothing to do.");
    return;
  }

  // Apply limit if specified
  const toProcess = limit
    ? sentencesNeedingAudio.slice(0, limit)
    : sentencesNeedingAudio;

  if (limit && sentencesNeedingAudio.length > limit) {
    console.log(`Limiting to ${limit} sentences (use --limit to change).`);
  }

  // Create a queue with concurrency of 3 to avoid overwhelming the APIs
  const queue = new Queue({ concurrency: 3, autostart: false });

  for (const sentence of toProcess) {
    queue.push(async () => {
      await generateAndUploadAudio({
        elevenlabs,
        s3Client,
        bucket: AWS_BUCKET,
        sentence,
      });
    });
  }

  console.log(`Starting audio generation for ${toProcess.length} sentences...`);
  await queue.start();
  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
