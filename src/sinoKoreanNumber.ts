import type { AppCard } from "./AppCard";
import type { DatabaseHelper } from "./database-helper";
import type { WordDatabaseRow } from "./database-spec";
import {
  SPECIAL_SINO_KOREAN_NUMBER_CATEGORY,
  SPECIAL_SINO_KOREAN_NUMBER_ID,
} from "./quizStateReducer";
import { getRandomItem, isDefined, verifyExists } from "./util";

type SinoKoreanNumber = {
  number: number;
  hangul: string;
};

const SINO_KOREAN_NUMBERS: SinoKoreanNumber[] = [
  { number: 1, hangul: "일" },
  { number: 2, hangul: "이" },
  { number: 3, hangul: "삼" },
  { number: 4, hangul: "사" },
  { number: 5, hangul: "오" },
  { number: 6, hangul: "육" },
  { number: 7, hangul: "칠" },
  { number: 8, hangul: "팔" },
  { number: 9, hangul: "구" },
  { number: 10, hangul: "십" },
  { number: 100, hangul: "백" },
  { number: 1000, hangul: "천" },
  { number: 10000, hangul: "만" },
];

type NumberWithWord = SinoKoreanNumber & {
  word?: WordDatabaseRow;
};

/**
 * Randomly generates a Sino-Korean number card.
 *
 * This should be the only card of its type in the deck.
 */
export function makeSinoKoreanNumberCard(dbHelper: DatabaseHelper): AppCard {
  const words: NumberWithWord[] = [];
  for (const n of SINO_KOREAN_NUMBERS) {
    const word = dbHelper.wordHangulMap.get(n.hangul);
    words.push({
      ...n,
      word,
    });
  }
  const getNumberWord = (x: number) =>
    verifyExists(words.find((word) => word.number === x));
  const digits = words.filter((word) => word.number < 10);
  const ten = getNumberWord(10);
  const ones = getRandomItem(digits);
  const tens = getRandomItem(digits);
  const numberString = (tens.number + ones.number * 10).toString();
  const answer = `${ones.hangul}${ten.hangul}${tens.hangul}`;
  const featuredWord = ten.word;
  const extraWords = [ones.word, tens.word].filter(isDefined);

  return {
    id: SPECIAL_SINO_KOREAN_NUMBER_ID,
    category: SPECIAL_SINO_KOREAN_NUMBER_CATEGORY,
    notionId: featuredWord?.id,

    // We don't want this to constantly show up at the top of the deck
    // when it's ordered reverse chronologically, so just hard-code a
    // time in the past for now.
    createdTime: "2025-09-17T05:26:00.000Z",
    lastModifiedTime: "2025-09-17T05:26:00.000Z",

    name: answer,
    isTranslation: true,
    hangul: answer,
    fillInTheBlankItems: [
      {
        type: "fill-in",
        blankValue: numberString,
        answer,
      },
    ],
    notes: numberString,
    picture: featuredWord?.picture ?? {
      type: "emojis",
      // This is silly but we really want it to show up in
      // the picture mode, even if it ... doesn't have a picture.
      emojis: numberString,
    },
    extraWords,
  };
}
