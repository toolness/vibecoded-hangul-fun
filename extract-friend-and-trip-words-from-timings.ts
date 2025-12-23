import { readFileSync } from "fs";

const content = JSON.parse(
  readFileSync("friend-and-trip-timings.json", { encoding: "utf-8" }),
);

const words: Set<string> = new Set();

for (const segment of content.segments) {
  for (const word of segment.words) {
    const text: string = word.text;
    const trimmed = text.trim().replace(/[,.]/g, "");
    if (trimmed && !words.has(trimmed)) {
      words.add(trimmed);
      console.log(trimmed);
    }
  }
}
