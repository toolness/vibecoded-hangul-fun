import type { AppCard } from "./AppCard";
import {
  SPECIAL_SINO_KOREAN_NUMBER_CATEGORY,
  SPECIAL_SINO_KOREAN_NUMBER_ID,
} from "./quizStateReducer";
import { getRandomItem, verifyExists } from "./util";

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

/**
 * Randomly generates a Sino-Korean number card.
 *
 * This should be the only card of its type in the deck.
 */
export function makeSinoKoreanNumberCard(): AppCard {
  const getNumberWord = (x: number) =>
    verifyExists(SINO_KOREAN_NUMBERS.find((word) => word.number === x));
  const digits = SINO_KOREAN_NUMBERS.filter((word) => word.number < 10);
  const ten = getNumberWord(10);
  const ones = getRandomItem(digits);
  const tens = getRandomItem(digits);
  const numberString = (tens.number + ones.number * 10).toString();
  const answer = `${ones.hangul}${ten.hangul}${tens.hangul}`;

  return {
    id: SPECIAL_SINO_KOREAN_NUMBER_ID,
    category: SPECIAL_SINO_KOREAN_NUMBER_CATEGORY,
    notionId: undefined,

    // We don't want this to constantly show up at the top of the deck
    // when it's ordered reverse chronologically, so just hard-code a
    // time in the past for now.
    createdTime: "2025-09-17T05:26:00.000Z",
    lastModifiedTime: "2025-09-17T05:26:00.000Z",

    name: answer,
    isTranslation: true,
    hangul: answer,
    picture: {
      type: "emojis",
      emojis: numberString,
    },
  };
}
