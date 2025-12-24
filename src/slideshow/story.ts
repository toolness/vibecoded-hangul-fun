type ParsedStory = {
  /**
   * The text of the story _without_ any vocab words in
   * parenthesis
   */
  text: string;

  /**
   * A mapping from whole words as they appear in `text`
   * (without any punctuation, just Hangul) to the
   * vocabulary words they correspond to.
   */
  vocabularyMapping: Record<string, string[]>;
};

export function parseStory(story: string): ParsedStory {
  const vocabularyMapping: Record<string, string[]> = {};

  // Match a word followed by vocab annotations in parentheses
  // The word can include Hangul and punctuation
  // The parentheses contain comma-separated vocab words
  const annotationPattern = /(\S+)\s+\(([^)]+)\)/g;

  let match;
  while ((match = annotationPattern.exec(story)) !== null) {
    const wordWithPunctuation = match[1];
    const vocabString = match[2];

    // Extract just the Hangul from the word (Hangul Syllables range: AC00-D7AF)
    const hangulOnly = wordWithPunctuation.replace(/[^\uAC00-\uD7AF]/g, "");

    // Parse the vocab words (comma-separated)
    const vocabWords = vocabString.split(",").map((v) => v.trim());

    // Add to mapping (only if we have Hangul)
    if (hangulOnly) {
      vocabularyMapping[hangulOnly] = vocabWords;
    }
  }

  // Remove all parenthetical annotations from the text
  const text = story.replace(/\s+\([^)]+\)/g, "");

  return { text, vocabularyMapping };
}
