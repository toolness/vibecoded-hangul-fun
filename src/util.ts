import type { WordDatabaseRow } from "./database-spec";
import type { Ordering } from "./quizStateReducer";

type Sortable = Pick<WordDatabaseRow, "createdTime" | "lastIncorrect" | "name">;

/**
 * Sorts entries in-place by the given ordering:
 *
 *   * `created-by`: Created time, newest first, breaking ties by name.
 *
 *   * `last-incorrect`: Last incorrect, newest first, breaking ties by name.
 *     Entries without a "Last incorrect" field will be at the end.
 */
export function sortByOrderingAndName(ordering: Ordering, rows: Sortable[]) {
  if (ordering === "created-by") {
    rows.sort((a, b) => {
      const dateA = new Date(a.createdTime).getTime();
      const dateB = new Date(b.createdTime).getTime();
      if (dateA === dateB) {
        return a.name.localeCompare(b.name);
      }
      return dateB - dateA;
    });
  } else if (ordering === "last-incorrect") {
    rows.sort((a, b) => {
      const dateA = a.lastIncorrect || "1970-01-01";
      const dateB = b.lastIncorrect || "1970-01-01";
      if (dateA === dateB) {
        return a.name.localeCompare(b.name);
      }
      return dateB.localeCompare(dateA);
    });
  } else {
    unreachable(ordering);
  }
}

/**
 * Simple function for ensuring branching logic is exhaustive.
 */
export function unreachable(value: never): never {
  throw new Error(`Unreachable code reached with unexpected value: ${value}`);
}

/**
 * Finds the most recent lastModifiedTime in an array of entries.
 * Returns undefined if the array is empty.
 */
export function findMostRecentModificationTime(
  entries: Array<{ lastModifiedTime: string }>,
): string | undefined {
  if (entries.length === 0) {
    return undefined;
  }

  return entries.reduce((latest, entry) => {
    return entry.lastModifiedTime > latest ? entry.lastModifiedTime : latest;
  }, entries[0].lastModifiedTime);
}

/**
 * Merges old entries with new entries, handling disabled entries as tombstones.
 *
 * @param oldEntries - Existing entries from the database
 * @param newEntries - Newly fetched entries from Notion
 * @param getDisabled - Function to determine if an entry is disabled
 * @returns Merged array of entries
 */
export function mergeEntries<T extends { id: string }>(
  oldEntries: T[],
  newEntries: Array<T & { disabled?: boolean }>,
  getDisabled: (entry: T & { disabled?: boolean }) => boolean,
): T[] {
  // Create a map from old entries
  const entriesMap = new Map<string, T>();
  for (const entry of oldEntries) {
    entriesMap.set(entry.id, entry);
  }

  // Process new entries: add/update or remove based on Disabled flag
  for (const entry of newEntries) {
    if (getDisabled(entry)) {
      // Remove from map if disabled (tombstone)
      entriesMap.delete(entry.id);
    } else {
      // Add or update entry
      entriesMap.set(entry.id, entry);
    }
  }

  // Convert map values back to array
  return Array.from(entriesMap.values());
}

/**
 * Return a random item from the given list.
 */
export function getRandomItem<T>(list: T[]): T {
  if (list.length === 0) {
    throw new Error("Cannot select a random item from an empty list.");
  }
  const randomIndex = Math.floor(Math.random() * list.length);
  return list[randomIndex];
}

export function getRandomBoolean(): boolean {
  return getRandomItem([true, false]);
}

/**
 * Return a random integer within the given range, inclusive.
 */
export function getRandomInt(min: number, max: number): number {
  const minInt = Math.ceil(min);
  const maxInt = Math.floor(max);
  if (minInt > maxInt) {
    throw new Error("min must be less than or equal to max");
  }
  return Math.floor(Math.random() * (maxInt - minInt + 1)) + minInt;
}

export function isDefined<T>(item: T | undefined): item is T {
  return item !== undefined;
}

export function verifyExists<T>(item: T | undefined): T {
  if (item === undefined) {
    throw new Error(`Expected value to not be undefined!`);
  }
  return item;
}

export function convertWordsToCharacters(
  text: string,
  replacementCharacter: string,
) {
  return text
    .split("")
    .map((char) => (char !== " " ? replacementCharacter : char))
    .join("");
}

export function convertWordsToUnderscores(text: string): string {
  return convertWordsToCharacters(text, "_");
}
