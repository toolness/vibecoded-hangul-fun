import { describe, it, expect } from "vitest";
import { getQuizableItemGroups } from "./sentence-utils";
import type { SentenceMarkupItem } from "./database-spec";

describe("getQuizableItemGroups", () => {
  it("should return empty array when no quizable items", () => {
    const markupItems: SentenceMarkupItem[] = [
      { text: "hello" },
      { text: "world" },
    ];
    expect(getQuizableItemGroups(markupItems)).toEqual([]);
  });

  it("should return one group for single quizable item with wordId", () => {
    const markupItems: SentenceMarkupItem[] = [
      { text: "hello", wordId: "word-1" },
    ];
    expect(getQuizableItemGroups(markupItems)).toEqual([
      { indices: [0], text: "hello", wordId: "word-1" },
    ]);
  });

  it("should return one group for single quizable item with forceQuiz", () => {
    const markupItems: SentenceMarkupItem[] = [
      { text: "hello", forceQuiz: true },
    ];
    expect(getQuizableItemGroups(markupItems)).toEqual([
      { indices: [0], text: "hello", wordId: undefined },
    ]);
  });

  it("should return separate groups for multiple unique words", () => {
    const markupItems: SentenceMarkupItem[] = [
      { text: "hello", wordId: "word-1" },
      { text: " " },
      { text: "world", wordId: "word-2" },
    ];
    expect(getQuizableItemGroups(markupItems)).toEqual([
      { indices: [0], text: "hello", wordId: "word-1" },
      { indices: [2], text: "world", wordId: "word-2" },
    ]);
  });

  it("should group duplicate words by matching text", () => {
    const markupItems: SentenceMarkupItem[] = [
      { text: "함께 " },
      { text: "잡니까", wordId: "word-1" },
      { text: ", 아니면 따로 " },
      { text: "잡니까", wordId: "word-1" },
    ];
    expect(getQuizableItemGroups(markupItems)).toEqual([
      { indices: [1, 3], text: "잡니까", wordId: "word-1" },
    ]);
  });

  it("should group by text even when wordIds differ", () => {
    const markupItems: SentenceMarkupItem[] = [
      { text: "잡니까", wordId: "word-1" },
      { text: " and " },
      { text: "잡니까", wordId: "word-2" },
    ];
    expect(getQuizableItemGroups(markupItems)).toEqual([
      { indices: [0, 2], text: "잡니까", wordId: "word-1" },
    ]);
  });

  it("should respect doNotQuiz flag", () => {
    const markupItems: SentenceMarkupItem[] = [
      { text: "hello", wordId: "word-1", doNotQuiz: true },
      { text: " " },
      { text: "world", wordId: "word-2" },
    ];
    expect(getQuizableItemGroups(markupItems)).toEqual([
      { indices: [2], text: "world", wordId: "word-2" },
    ]);
  });

  it("should exclude doNotQuiz items from groups even when text matches", () => {
    const markupItems: SentenceMarkupItem[] = [
      { text: "hello", wordId: "word-1" },
      { text: " " },
      { text: "hello", wordId: "word-2", doNotQuiz: true },
    ];
    expect(getQuizableItemGroups(markupItems)).toEqual([
      { indices: [0], text: "hello", wordId: "word-1" },
    ]);
  });

  it("should include forceQuiz items without wordId", () => {
    const markupItems: SentenceMarkupItem[] = [
      { text: "hello", forceQuiz: true },
      { text: " " },
      { text: "world", wordId: "word-1" },
    ];
    expect(getQuizableItemGroups(markupItems)).toEqual([
      { indices: [0], text: "hello", wordId: undefined },
      { indices: [2], text: "world", wordId: "word-1" },
    ]);
  });

  it("should handle mixed scenario with wordId, forceQuiz, doNotQuiz, and duplicates", () => {
    const markupItems: SentenceMarkupItem[] = [
      { text: "a", wordId: "word-1" },
      { text: " " },
      { text: "b", forceQuiz: true },
      { text: " " },
      { text: "a", wordId: "word-2" },
      { text: " " },
      { text: "c", wordId: "word-3", doNotQuiz: true },
      { text: " " },
      { text: "b", wordId: "word-4" },
    ];
    expect(getQuizableItemGroups(markupItems)).toEqual([
      { indices: [0, 4], text: "a", wordId: "word-1" },
      { indices: [2, 8], text: "b", wordId: undefined },
    ]);
  });

  it("should preserve order of first occurrence", () => {
    const markupItems: SentenceMarkupItem[] = [
      { text: "z", wordId: "word-1" },
      { text: " " },
      { text: "a", wordId: "word-2" },
      { text: " " },
      { text: "z", wordId: "word-3" },
    ];
    const groups = getQuizableItemGroups(markupItems);
    expect(groups[0].text).toBe("z");
    expect(groups[1].text).toBe("a");
  });

  it("should handle empty array", () => {
    expect(getQuizableItemGroups([])).toEqual([]);
  });

  it("should use wordId from first occurrence when grouping", () => {
    const markupItems: SentenceMarkupItem[] = [
      { text: "hello", wordId: "first-word-id" },
      { text: " " },
      { text: "hello", wordId: "second-word-id" },
    ];
    const groups = getQuizableItemGroups(markupItems);
    expect(groups[0].wordId).toBe("first-word-id");
  });
});
