/**
 * Defines the picture that represents a word.
 */
export type WordPicture =
  | {
      type: "remote-image";
      /**
       * Absolute URL pointing to an image of the word. Should
       * never be an empty string.
       */
      url: string;
    }
  | {
      /**
       * Optional local image filename (relative to assets/database).
       * Should never be an empty string.
       */
      type: "local-image";
      filename: string;
    }
  | {
      type: "emojis";
      /**
       * The emoji (or sequence of emojis) that represent the word
       * pictorially. Should never be an empty string.
       */
      emojis: string;
    };

/**
 * Represents a row describing an English/romanized word,
 * its Hangul equivalent, and any additional metadata.
 */
export interface DatabaseRow {
  /** Unique ID for this row (UUID). */
  id: string;

  /** The English/romanized text. */
  name: string;

  /** The Hangul equivalent of the English/romanized text. */
  hangul: string;

  /**
   * If false/undefined, `name` represents a Hangul romanization
   * (e.g. "Seoul"), otherwise it represents an English translation
   * of the word (e.g. "Art").
   */
  isTranslation?: boolean;

  /**
   * URL for where the user can learn more about the entity
   * being described. It may be an empty string.
   */
  url?: string;

  /**
   * The picture that represents the word, if any.
   */
  picture?: WordPicture;

  /**
   * Optional category for the word. It may be an empty
   * string.
   */
  category?: string;

  /**
   * Pronunciation notes. It may be an empty string.
   */
  notes?: string;

  /**
   * Optional local audio filename (relative to assets/database).
   * It may be an empty string.
   */
  audio?: string;

  /**
   * UUIDs of rows that constitute a minimal pair with this one.
   * If defined, the array will never be empty.
   */
  minimalPairs?: string[];
}
