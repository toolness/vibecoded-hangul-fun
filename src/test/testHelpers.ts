import type { AppCard } from "../AppCard";

export function createTestAppCard(
  row: Omit<AppCard, "createdTime" | "lastModifiedTime" | "notionId"> & {
    notionId?: string;
    createdTime?: string;
    lastModifiedTime?: string;
  },
): AppCard {
  return {
    ...row,
    notionId: row.id,
    createdTime: row.createdTime ?? "2025-09-17T05:26:00.000Z",
    lastModifiedTime: row.lastModifiedTime ?? "2025-09-17T05:26:00.000Z",
  };
}
