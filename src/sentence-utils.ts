import type { SentenceMarkupItem } from "./database-spec";

/**
 * Represents a group of quizable markup items that share the same text.
 * All items in a group will be blanked together in fill-in-the-blank exercises.
 */
export type QuizableItemGroup = {
  /** Positions of these items in the markupItems array */
  indices: number[];
  /** The text being blanked */
  text: string;
  /** First item's wordId (for picture/word lookup) */
  wordId?: string;
};

/**
 * Groups quizable markup items by their text value.
 *
 * Items are considered quizable if they have a wordId or forceQuiz=true,
 * and do not have doNotQuiz=true.
 *
 * Multiple occurrences of the same text are grouped together so they
 * can be treated as a single blank appearing multiple times.
 *
 * @param markupItems - The sentence's markup items
 * @returns Groups in order of first occurrence
 */
export function getQuizableItemGroups(
  markupItems: SentenceMarkupItem[],
): QuizableItemGroup[] {
  const groupMap = new Map<string, QuizableItemGroup>();
  const groupOrder: string[] = [];

  for (let index = 0; index < markupItems.length; index++) {
    const item = markupItems[index];

    // Skip non-quizable items
    if ((!item.wordId && !item.forceQuiz) || item.doNotQuiz) {
      continue;
    }

    const key = item.text;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        indices: [index],
        text: item.text,
        wordId: item.wordId,
      });
      groupOrder.push(key);
    } else {
      groupMap.get(key)!.indices.push(index);
    }
  }

  return groupOrder.map((key) => groupMap.get(key)!);
}
