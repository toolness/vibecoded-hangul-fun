import type { WordDatabaseRow } from "./database-spec";

type WithCreatedTimeAndName = Pick<WordDatabaseRow, "createdTime" | "name">;

/**
 * Sort entries in-place by created time,
 * newest first, breaking ties by name.
 */
export function sortByDateAndName(rows: WithCreatedTimeAndName[]) {
  rows.sort((a, b) => {
    const dateA = new Date(a.createdTime).getTime();
    const dateB = new Date(b.createdTime).getTime();
    if (dateA === dateB) {
      return a.name.localeCompare(b.name);
    }
    return dateB - dateA;
  });
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

export function isDefined<T>(item: T | undefined): item is T {
  return item !== undefined;
}

export function convertWordsToUnderscores(text: string): string {
  return text
    .split("")
    .map((char) => (char !== " " ? "_" : char))
    .join("");
}
