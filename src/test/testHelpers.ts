import type { AppCard } from "../AppCard";

export function createTestAppCard(
  row: Omit<AppCard, "createdTime" | "notionId"> & {
    notionId?: string;
    createdTime?: string;
  },
): AppCard {
  return {
    ...row,
    notionId: row.id,
    createdTime: row.createdTime ?? "2025-09-17T05:26:00.000Z",
  };
}
