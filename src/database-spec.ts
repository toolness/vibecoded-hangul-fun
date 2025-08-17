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
   * URL for where the user can learn more about the entity
   * being described. It may be an empty string.
   */
  url?: string;

  /**
   * URL pointing to an image of the word. It may be an
   * empty string.
   */
  imageUrl?: string;

  /**
   * Optional category for the word. It may be an empty
   * string.
   */
  category?: string;

  /**
   * Optional local image filename (relative to assets/database).
   * It may be an empty string.
   */
  image?: string;

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
