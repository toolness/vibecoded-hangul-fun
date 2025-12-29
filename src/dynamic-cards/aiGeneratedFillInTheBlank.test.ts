import { describe, it, expect, beforeAll } from "vitest";
import { type AiGeneratedFillInTheBlankSentence } from "./aiGeneratedFillInTheBlank";
import { readFileSync } from "fs";

let sentences: AiGeneratedFillInTheBlankSentence[];

beforeAll(() => {
  sentences = JSON.parse(
    readFileSync("src/assets/ai-generated-sentences.json", {
      encoding: "utf-8",
    }),
  );
});

describe("AI-generated sentences", () => {
  it("has unique slugs with valid slug characters", () => {
    const slugs = new Set<string>();
    const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

    for (const sentence of sentences) {
      expect(slugs.has(sentence.slug)).toBe(false);
      slugs.add(sentence.slug);
      expect(sentence.slug).toMatch(slugPattern);
    }
  });

  it("has unique sentence text", () => {
    const sentenceTexts = new Set<string>();

    for (const sentence of sentences) {
      expect(sentenceTexts.has(sentence.sentence)).toBe(false);
      sentenceTexts.add(sentence.sentence);
    }
  });

  it("conforms to AiGeneratedFillInTheBlankSentence type", () => {
    for (const sentence of sentences) {
      expect(typeof sentence.sentence).toBe("string");
      expect(sentence.sentence.length).toBeGreaterThan(0);

      expect(typeof sentence.slug).toBe("string");
      expect(sentence.slug.length).toBeGreaterThan(0);

      expect(typeof sentence.vocabularyMappings).toBe("object");
      expect(sentence.vocabularyMappings).not.toBeNull();

      for (const [key, value] of Object.entries(sentence.vocabularyMappings)) {
        expect(typeof key).toBe("string");
        expect(Array.isArray(value)).toBe(true);
        for (const word of value) {
          expect(typeof word).toBe("string");
        }
      }
    }
  });
});
