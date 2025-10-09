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
