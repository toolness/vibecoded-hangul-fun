import type { WordDatabaseRow } from "../database-spec";

export function createTestDatabaseRow(
  row: Omit<WordDatabaseRow, "createdTime"> & {
    createdTime?: string;
  },
): WordDatabaseRow {
  return {
    ...row,
    createdTime: row.createdTime ?? "2025-09-17T05:26:00.000Z",
  };
}
