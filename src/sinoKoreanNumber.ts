import type { AppCard } from "./AppCard";
import {
  EMPTY_QUESTION,
  SPECIAL_SINO_KOREAN_NUMBER_CATEGORY,
  SPECIAL_SINO_KOREAN_NUMBER_ID,
} from "./quizStateReducer";
import { getRandomInt, verifyExists } from "./util";

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
];

export function makeSinoKoreanNumber(value: number): string | undefined {
  if (value <= 0 || value > 999_999 || Math.floor(value) !== value) {
    return;
  }
  const getDigitWord = (x: number) =>
    verifyExists(SINO_KOREAN_NUMBERS.find((word) => word.number === x)).hangul;
  const getDigitWordExceptOne = (x: number) => (x === 1 ? "" : getDigitWord(x));
  const parts: string[] = [];

  const tenThousands = Math.floor(value / 10_000);
  if (tenThousands > 0) {
    if (tenThousands === 1) {
      parts.push(`만`);
    } else {
      const tenThousandsHangul = verifyExists(
        makeSinoKoreanNumber(tenThousands),
      );
      parts.push(`${tenThousandsHangul}만`);
    }
    value -= tenThousands * 10_000;
  }

  const thousands = Math.floor(value / 1_000);
  if (thousands > 0) {
    parts.push(`${getDigitWordExceptOne(thousands)}천`);
    value -= thousands * 1_000;
  }

  const hundreds = Math.floor(value / 100);
  if (hundreds > 0) {
    parts.push(`${getDigitWordExceptOne(hundreds)}백`);
    value -= hundreds * 100;
  }

  const tens = Math.floor(value / 10);
  if (tens > 0) {
    parts.push(`${getDigitWordExceptOne(tens)}십`);
    value -= tens * 10;
  }

  const hangul = parts.join(" ");

  if (value > 0) {
    return `${hangul}${getDigitWord(value)}`;
  }
  return hangul;
}

/**
 * Generate a random number that's likely to be in units that
 * someone would see in Korean Won.
 */
function generateRandomNumber(): number {
  const random = Math.random();

  if (random < 0.2) {
    return getRandomInt(1, 99);
  } else if (random < 0.4) {
    if (Math.random() < 0.5) {
      // Return a number between 100 and 990 that's divisible by 10
      return getRandomInt(10, 99) * 10;
    } else {
      return getRandomInt(100, 999);
    }
  } else if (random < 0.6) {
    if (Math.random() < 0.5) {
      // Return a number between 1,000 and 9,900 that's divisible by 100
      return getRandomInt(10, 99) * 100;
    } else {
      // Return a number between 1,000 and 9,990 that's divisible by 10
      return getRandomInt(100, 999) * 10;
    }
  } else if (random < 0.8) {
    if (Math.random() < 0.5) {
      // Return a number between 10,000 and 99,000 that's divisible by 1,000
      return getRandomInt(10, 99) * 1_000;
    } else {
      // Return a number between 10,000 and 99,900 that's divisible by 100
      return getRandomInt(100, 999) * 100;
    }
  } else {
    // Return a number between 100,000 and 990,000 that's divisible by 10,000
    return getRandomInt(10, 99) * 10_000;
  }
}

/**
 * Randomly generates a Sino-Korean number card.
 *
 * This should be the only card of its type in the deck.
 */
export function makeSinoKoreanNumberCard(): AppCard {
  const number = generateRandomNumber();
  const numberString = number.toLocaleString("en-US");
  const answer = makeSinoKoreanNumber(number);

  if (!answer) {
    return EMPTY_QUESTION;
  }

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
    alternativeHangulAnswers: [
      // This looks weird, but a lot of speech-to-text systems
      // will insert numbers instead of Hangul for spoken Korean
      // numbers.
      //
      // The downside is that the user can simply type the number
      // and trivially "win", but it's not like we're keeping
      // score or anything.
      numberString,
      // Also include the number without commas.
      number.toString(),
    ],
    picture: {
      type: "emojis",
      emojis: numberString,
    },
  };
}
