import { describe, it, expect } from "vitest";
import { findMostRecentModificationTime, mergeEntries } from "./util";

describe("findMostRecentModificationTime", () => {
  it("returns undefined for empty array", () => {
    expect(findMostRecentModificationTime([])).toBeUndefined();
  });

  it("returns the only timestamp for single entry", () => {
    const entries = [{ lastModifiedTime: "2025-01-15T10:00:00.000Z" }];
    expect(findMostRecentModificationTime(entries)).toBe(
      "2025-01-15T10:00:00.000Z",
    );
  });

  it("returns the most recent timestamp from multiple entries", () => {
    const entries = [
      { lastModifiedTime: "2025-01-15T10:00:00.000Z" },
      { lastModifiedTime: "2025-01-20T15:30:00.000Z" },
      { lastModifiedTime: "2025-01-10T08:00:00.000Z" },
    ];
    expect(findMostRecentModificationTime(entries)).toBe(
      "2025-01-20T15:30:00.000Z",
    );
  });

  it("handles identical timestamps", () => {
    const entries = [
      { lastModifiedTime: "2025-01-15T10:00:00.000Z" },
      { lastModifiedTime: "2025-01-15T10:00:00.000Z" },
    ];
    expect(findMostRecentModificationTime(entries)).toBe(
      "2025-01-15T10:00:00.000Z",
    );
  });

  it("uses string comparison for timestamps", () => {
    const entries = [
      { lastModifiedTime: "2025-01-15T10:00:00.000Z" },
      { lastModifiedTime: "2025-01-15T09:59:59.999Z" },
    ];
    expect(findMostRecentModificationTime(entries)).toBe(
      "2025-01-15T10:00:00.000Z",
    );
  });
});

describe("mergeEntries", () => {
  type TestEntry = {
    id: string;
    name: string;
    value: number;
  };

  it("returns old entries when no new entries provided", () => {
    const oldEntries: TestEntry[] = [
      { id: "1", name: "one", value: 1 },
      { id: "2", name: "two", value: 2 },
    ];
    const result = mergeEntries(oldEntries, [], () => false);
    expect(result).toEqual(oldEntries);
  });

  it("returns new entries when no old entries provided", () => {
    const newEntries: TestEntry[] = [
      { id: "1", name: "one", value: 1 },
      { id: "2", name: "two", value: 2 },
    ];
    const result = mergeEntries<TestEntry>([], newEntries, () => false);
    expect(result).toEqual(newEntries);
  });

  it("adds new entries to old entries", () => {
    const oldEntries: TestEntry[] = [{ id: "1", name: "one", value: 1 }];
    const newEntries: TestEntry[] = [{ id: "2", name: "two", value: 2 }];
    const result = mergeEntries(oldEntries, newEntries, () => false);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ id: "1", name: "one", value: 1 });
    expect(result).toContainEqual({ id: "2", name: "two", value: 2 });
  });

  it("updates existing entries with new data", () => {
    const oldEntries: TestEntry[] = [
      { id: "1", name: "one", value: 1 },
      { id: "2", name: "two", value: 2 },
    ];
    const newEntries: TestEntry[] = [
      { id: "2", name: "two-updated", value: 22 },
    ];
    const result = mergeEntries(oldEntries, newEntries, () => false);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ id: "1", name: "one", value: 1 });
    expect(result).toContainEqual({ id: "2", name: "two-updated", value: 22 });
  });

  it("removes disabled entries (tombstones)", () => {
    const oldEntries: TestEntry[] = [
      { id: "1", name: "one", value: 1 },
      { id: "2", name: "two", value: 2 },
      { id: "3", name: "three", value: 3 },
    ];
    const newEntries: Array<TestEntry & { disabled?: boolean }> = [
      { id: "2", name: "two", value: 2, disabled: true },
    ];
    const result = mergeEntries(
      oldEntries,
      newEntries,
      (entry) => entry.disabled === true,
    );
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ id: "1", name: "one", value: 1 });
    expect(result).toContainEqual({ id: "3", name: "three", value: 3 });
    expect(result).not.toContainEqual(expect.objectContaining({ id: "2" }));
  });

  it("handles mix of additions, updates, and deletions", () => {
    const oldEntries: TestEntry[] = [
      { id: "1", name: "one", value: 1 },
      { id: "2", name: "two", value: 2 },
      { id: "3", name: "three", value: 3 },
    ];
    const newEntries: Array<TestEntry & { disabled?: boolean }> = [
      { id: "2", name: "two-updated", value: 22 }, // update
      { id: "3", name: "three", value: 3, disabled: true }, // delete
      { id: "4", name: "four", value: 4 }, // add
    ];
    const result = mergeEntries(
      oldEntries,
      newEntries,
      (entry) => entry.disabled === true,
    );
    expect(result).toHaveLength(3);
    expect(result).toContainEqual({ id: "1", name: "one", value: 1 });
    expect(result).toContainEqual({ id: "2", name: "two-updated", value: 22 });
    expect(result).toContainEqual({ id: "4", name: "four", value: 4 });
    expect(result).not.toContainEqual(expect.objectContaining({ id: "3" }));
  });

  it("ignores disabled flag when getDisabled returns false", () => {
    const oldEntries: TestEntry[] = [{ id: "1", name: "one", value: 1 }];
    const newEntries: Array<TestEntry & { disabled?: boolean }> = [
      { id: "2", name: "two", value: 2, disabled: true },
    ];
    const result = mergeEntries(oldEntries, newEntries, () => false);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ id: "1", name: "one", value: 1 });
    expect(result).toContainEqual({
      id: "2",
      name: "two",
      value: 2,
      disabled: true,
    });
  });

  it("handles removing non-existent entries gracefully", () => {
    const oldEntries: TestEntry[] = [{ id: "1", name: "one", value: 1 }];
    const newEntries: Array<TestEntry & { disabled?: boolean }> = [
      { id: "999", name: "nonexistent", value: 999, disabled: true },
    ];
    const result = mergeEntries(
      oldEntries,
      newEntries,
      (entry) => entry.disabled === true,
    );
    expect(result).toHaveLength(1);
    expect(result).toContainEqual({ id: "1", name: "one", value: 1 });
  });
});
