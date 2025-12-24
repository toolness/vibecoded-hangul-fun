import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { parseStory } from "./src/slideshow/story.ts";

const run = () => {
  const inputFile = process.argv[2];
  if (!inputFile) {
    console.error(
      "Usage: node --experimental-strip-types parse-story.ts <input-file>",
    );
    console.error(
      "Example: node --experimental-strip-types parse-story.ts story.txt",
    );
    process.exit(1);
  }

  const content = readFileSync(inputFile, "utf-8");
  const parsed = parseStory(content);

  // Derive output filenames from input filename
  const ext = path.extname(inputFile);
  const base = inputFile.slice(0, -ext.length || undefined);
  const plainFile = `${base}.plain.txt`;
  const mappingFile = `${base}.mapping.json`;

  writeFileSync(plainFile, parsed.text, "utf-8");
  console.log(`Wrote ${plainFile}`);

  writeFileSync(
    mappingFile,
    JSON.stringify(parsed.vocabularyMapping, null, 2),
    "utf-8",
  );
  console.log(`Wrote ${mappingFile}`);
};

run();
