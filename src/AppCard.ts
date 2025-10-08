import type { WordDatabaseRow } from "./database-spec";

export type AppCard = WordDatabaseRow & {
  /**
   * Unique ID for this card. Not always the
   * same as `notionId`.
   */
  id: string;

  /**
   * The ID of the notion page that the data for this
   * card is stored in.
   */
  notionId: string;

  /**
   * If the card represents a word (or words) in a
   * sentence and the user needs to fill in the blank,
   * this is the full sentence, with the word(s) replaced
   * with underscores.
   */
  fillInTheBlankText?: string;
};
