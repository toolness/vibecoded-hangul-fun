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
  notionId: string | undefined;

  /**
   * The full hangul that should be pronounced by
   * the text-to-speech system, if no audio is available.
   *
   * This may be different from `hangul`, which represents
   * what the user needs to type, especially if the card
   * represents a fill-in-the-blank card.
   */
  fullHangul?: string;

  /**
   * If the card represents a word (or words) in a
   * sentence and the user needs to fill in the blank,
   * this will be defined.
   *
   * If present, the array will never be empty.
   */
  fillInTheBlankItems?: FillInTheBlankItem[];

  /**
   * Any extra auxiliary words to show on the card.
   *
   * If present, the array may be empty.
   */
  extraWords?: WordDatabaseRow[];
};

export type FillInTheBlankItem =
  | {
      type: "content";
      /**
       * Non-fill in the blank text, regular content
       * to be displayed as-is.
       */
      value: string;
    }
  | {
      type: "fill-in";
      /**
       * The blank value to use (generally this is just the
       * answer with characters replaced by underscores).
       */
      blankValue: string;
      /**
       * The answer to the fill-in-the-blank.
       */
      answer: string;
    };

export function hasPictures(card: AppCard) {
  if (card.picture) {
    return true;
  }
  return (card.extraWords ?? []).some((word) => Boolean(word.picture));
}
