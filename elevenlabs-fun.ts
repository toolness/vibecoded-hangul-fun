import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import dotenv from "dotenv";
import { createWriteStream } from "fs";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

import { ensureEnvironmentVar } from "./src/cli/cli-util.ts";

dotenv.config();

const elevenlabs = new ElevenLabsClient({
  apiKey: ensureEnvironmentVar("ELEVENLABS_API_KEY"),
});

// "Chungman" voice.
const VOICE_ID = "8MwPLtBplylvbrksiBOC";

const audio = await elevenlabs.textToSpeech.convert(VOICE_ID, {
  text: "할아버지가 책을 읽어요.",
  outputFormat: "mp3_44100_96",
  modelId: "eleven_turbo_v2_5",
  languageCode: "ko",
  voiceSettings: {
    speed: 0.7,
  },
  applyTextNormalization: "auto",
});

await pipeline(Readable.from(audio), createWriteStream("example.mp3"));
console.log("Audio saved to example.mp3");
