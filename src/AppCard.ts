import type { WordDatabaseRow } from "./database-spec";

export type AppCard = WordDatabaseRow & {
  /**
   * If the card represents a word (or words) in a
   * sentence and the user needs to fill in the blank,
   * this is the full sentence, with the word(s) replaced
   * with underscores.
   */
  fillInTheBlankText?: string;
};
