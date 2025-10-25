import type {
  Database,
  SentenceDatabaseRow,
  WordDatabaseRow,
} from "./database-spec";

export class DatabaseHelper {
  database: Database;
  wordIdMap: Map<string, WordDatabaseRow> = new Map();
  wordHangulMap: Map<string, WordDatabaseRow> = new Map();

  constructor(database: Database) {
    this.database = database;
    for (const word of database.words) {
      this.wordIdMap.set(word.id, word);
      this.wordHangulMap.set(word.hangul, word);
    }
  }

  /**
   * Returns all words used in markup and/or listed in
   * the `wordIds` array, removing duplicates.
   */
  getSentenceWords(sentence: SentenceDatabaseRow): WordDatabaseRow[] {
    const result: WordDatabaseRow[] = [];
    // Sets are actually ordered (insertion order)!
    const wordIds: Set<string> = new Set();
    for (const markupItem of sentence.markupItems ?? []) {
      if (markupItem.wordId) {
        wordIds.add(markupItem.wordId);
      }
    }
    for (const wordId of sentence.wordIds ?? []) {
      wordIds.add(wordId);
    }
    for (const wordId of wordIds) {
      const word = this.wordIdMap.get(wordId);
      if (word) {
        result.push(word);
      }
    }
    return result;
  }
}
