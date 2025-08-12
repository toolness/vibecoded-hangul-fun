/**
 * Represents a row describing an English/romanized word,
 * its Hangul equivalent, and any additional metadata.
 */
export interface DatabaseRow {
  /** The English/romanized text. */
  name: string;

  /** The Hangul equivalent of the English/romanized text. */
  hangul: string;

  /**
   * URL for where the user can learn more about the entity
   * being described. It may be an empty string.
   */
  url: string;

  /**
   * URL pointing to an image of the word. It may be an
   * empty string.
   */
  imageUrl: string;
}
