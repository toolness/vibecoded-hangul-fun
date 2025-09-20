import type { DatabaseRow } from "../database-spec";

export function createTestDatabaseRow(
  row: Omit<DatabaseRow, "createdTime"> & {
    createdTime?: string;
  },
): DatabaseRow {
  return {
    ...row,
    createdTime: row.createdTime ?? "2025-09-17T05:26:00.000Z",
  };
}
