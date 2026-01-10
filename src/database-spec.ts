/**
 * Whenever we change the database schema, _or_ the algorithm
 * used to convert Notion's raw API responses into the DB
 * schema, this version number should be incremented!
 */
export const DATABASE_SCHEMA_VERSION = 4 as const;

export function makeEmptyDatabase(): Database {
  return { words: [], sentences: [], __schemaVersion: DATABASE_SCHEMA_VERSION };
}

export interface Database {
  /**
   * If this isn't equal to DATABASE_SCHEMA_VERSION, we shouldn't
   * process it!
   */
  __schemaVersion: typeof DATABASE_SCHEMA_VERSION;
  words: WordDatabaseRow[];
  sentences: SentenceDatabaseRow[];
}

/**
 * Defines the picture that represents a word.
 */
export type WordPicture =
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
export interface WordDatabaseRow {
  /** Unique ID for this row (UUID). */
  id: string;

  /** ISO date the row was created, e.g. "2025-09-17T05:26:00.000Z". */
  createdTime: string;

  /** ISO date the row was last modified, e.g. "2025-09-17T05:26:00.000Z". */
  lastModifiedTime: string;

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

  /**
   * An example sentence (or lyric from a song) that uses the word.
   */
  exampleSentence?: BaseSentence;

  /**
   * Date string (YYYY-MM-DD) indicating when the user last
   * got this word wrong in Anki. Used for spaced repetition tracking.
   */
  lastIncorrect?: string;
}

export interface BaseSentence {
  /**
   * The actual sentence.
   */
  text: string;

  /**
   * Optional local audio filename (relative to assets/database).
   * It may be an empty string.
   */
  audio?: string;
}

export interface SentenceDatabaseRow extends BaseSentence {
  /** Unique UUID for the sentence. */
  id: string;

  /** ISO date the row was created, e.g. "2025-09-17T05:26:00.000Z". */
  createdTime: string;

  /** ISO date the row was last modified, e.g. "2025-09-17T05:26:00.000Z". */
  lastModifiedTime: string;

  /**
   * Sentence markup items.
   *
   * If defined, the array will never be empty.
   */
  markupItems?: SentenceMarkupItem[];

  /**
   * The {@link WordDatabaseRow} IDs of words used in
   * the sentence.
   */
  wordIds?: string[];

  /**
   * Pronunciation notes. It may be an empty string.
   */
  notes?: string;

  /**
   * Date string (YYYY-MM-DD) indicating when the user last
   * got this sentence wrong in Anki. Used for spaced repetition tracking.
   */
  lastIncorrect?: string;
}

export interface SentenceMarkupItem {
  /**
   * Text of the sentence item.
   */
  text: string;

  /**
   * ID of the word this represents. Points to a
   * {@link WordDatabaseRow.id}.
   */
  wordId?: string;

  /**
   * If true, don't quiz the user about this word.
   *
   * @deprecated There's not really a reason to use this,
   * try to avoid it.
   */
  doNotQuiz?: true;

  /**
   * If `wordId` isn't set, setting this to true will force
   * quizzing the user on this part of the sentence.
   */
  forceQuiz?: true;
}
