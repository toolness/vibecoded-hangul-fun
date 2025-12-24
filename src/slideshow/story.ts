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
  // TODO: Implement this!
}
