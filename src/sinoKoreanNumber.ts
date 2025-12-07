import type { DynamicCardFactory } from "./DynamicCard";
import { EMPTY_QUESTION, type Difficulty } from "./quizStateReducer";
import { getRandomInt, verifyExists } from "./util";

type SinoKoreanNumber = {
  number: number;
  hangul: string;
};

/**
 * Since 2003, the exchange rate has varied between
 * a high of 0.00067 (2009) to a low of 0.0011 (2007).
 *
 * As of November 2025, it's around the value below.
 */
const WON_EXCHANGE_RATE = 0.0007;

const SINO_KOREAN_DIGITS: SinoKoreanNumber[] = [
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
    verifyExists(SINO_KOREAN_DIGITS.find((word) => word.number === x)).hangul;
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
function generateRandomNumber(difficulty: Difficulty): number {
  const random = Math.random();

  if (random < 0.2) {
    return getRandomInt(1, 99);
  } else if (random < 0.4) {
    if (difficulty === "easy") {
      // Return a number between 100 and 900 that's divisible by 100
      return getRandomInt(1, 9) * 100;
    } else if (Math.random() < 0.66 || difficulty === "medium") {
      // Return a number between 100 and 990 that's divisible by 10
      return getRandomInt(10, 99) * 10;
    } else {
      return getRandomInt(100, 999);
    }
  } else if (random < 0.6) {
    if (difficulty === "easy") {
      // Return a number between 1,000 and 9,000 that's divisible by 1,000
      return getRandomInt(1, 9) * 1_000;
    } else if (Math.random() < 0.66 || difficulty === "medium") {
      // Return a number between 1,000 and 9,900 that's divisible by 100
      return getRandomInt(10, 99) * 100;
    } else {
      // Return a number between 1,000 and 9,990 that's divisible by 10
      return getRandomInt(100, 999) * 10;
    }
  } else if (random < 0.8) {
    if (difficulty === "easy") {
      // Return a number between 10,000 and 90,000 that's divisible by 10,000
      return getRandomInt(1, 9) * 10_000;
    } else if (Math.random() < 0.66 || difficulty === "medium") {
      // Return a number between 10,000 and 99,000 that's divisible by 1,000
      return getRandomInt(10, 99) * 1_000;
    } else {
      // Return a number between 10,000 and 99,900 that's divisible by 100
      return getRandomInt(100, 999) * 100;
    }
  } else {
    if (difficulty === "easy") {
      // Return a number between 100,000 and 900,000 that's divisible by 100,000
      return getRandomInt(1, 9) * 100_000;
    } else {
      // Return a number between 100,000 and 990,000 that's divisible by 10,000
      return getRandomInt(10, 99) * 10_000;
    }
  }
}

function getUsCurrencyString(won: number): string {
  const dollars = WON_EXCHANGE_RATE * won;

  if (dollars < 1) {
    const cents = dollars * 100;
    if (cents < 1) {
      return "less than 1¢";
    } else {
      return `about ${Math.round(cents)}¢`;
    }
  } else {
    return `about $${Math.round(dollars)}`;
  }
}

export const SinoKoreanNumberDynamicCard: DynamicCardFactory = {
  category: "Special: Money",
  create({ difficulty }) {
    const number = generateRandomNumber(difficulty);
    const numberString = number.toLocaleString("en-US");
    const answer = makeSinoKoreanNumber(number);
    const usCurrencyString = getUsCurrencyString(number);

    if (!answer) {
      return EMPTY_QUESTION;
    }

    return {
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
        emojis: `₩${numberString}`,
      },
      notes: `₩${numberString} is ${usCurrencyString}.`,
    };
  },
};
