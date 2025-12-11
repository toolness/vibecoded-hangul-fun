import type { DynamicCardFactory } from "../DynamicCard";
import { EMPTY_QUESTION, type Difficulty } from "../quizStateReducer";
import { getRandomInt } from "../util";
import { KOREAN_NUMBERS } from "./restaurantOrdering";
import { makeSinoKoreanNumber } from "./sinoKoreanNumber";

function generateRandomMinute(difficulty: Difficulty): number {
  if (difficulty === "easy") {
    const random = Math.random();
    if (random > 0.25) {
      return 0;
    }
    return 30;
  } else if (difficulty === "hard") {
    return getRandomInt(0, 59);
  }
  const tensDigit = getRandomInt(0, 5) * 10;
  const random = Math.random();
  if (random > 0.5) {
    return tensDigit;
  }
  return tensDigit + 5;
}

export function makeKoreanNumberForHour(value: number): string | undefined {
  if (value > 12 || value === 0) {
    return undefined;
  }
  if (value <= 10) {
    const number = KOREAN_NUMBERS.at(value - 1);
    if (number) {
      return number.short ?? number.long;
    }
  } else {
    const onesDigit = makeKoreanNumberForHour(value - 10);
    if (onesDigit) {
      return `열${onesDigit}`;
    }
  }
}

export function makeHangulForTime(
  hour: number,
  minute: number,
):
  | undefined
  | {
      hangul: string;
      alternativeHangulAnswers?: string[];
    } {
  const hourNumberHangul = makeKoreanNumberForHour(hour);

  if (!hourNumberHangul) {
    return;
  }

  const hourHangul = `${hourNumberHangul}시`;

  if (minute === 0) {
    return {
      hangul: hourHangul,
      alternativeHangulAnswers: [`${hour}시`],
    };
  }

  const minuteNumberHangul = makeSinoKoreanNumber(minute);

  if (!minuteNumberHangul) {
    return;
  }

  const result = {
    hangul: `${hourHangul} ${minuteNumberHangul}분`,
    alternativeHangulAnswers: [`${hour}시 ${minute}분`],
  };

  if (minute === 30) {
    result.alternativeHangulAnswers.push(`${hourHangul} 반`, `${hour}시 반`);
  }

  return result;
}

export function makeEnglishTimeString(hour: number, minute: number): string {
  const hourPart = hour.toString();
  const minutePart = minute.toString().padStart(2, "0");
  return `${hourPart}:${minutePart}`;
}

export const TellingTimeDynamicCard: DynamicCardFactory = {
  category: "Special: Time",
  create({ difficulty }) {
    const hour = getRandomInt(1, 12);
    const minute = generateRandomMinute(difficulty);
    const result = makeHangulForTime(hour, minute);
    const englishTimeString = makeEnglishTimeString(hour, minute);

    if (!result) {
      return EMPTY_QUESTION;
    }

    const { hangul, alternativeHangulAnswers } = result;

    return {
      name: hangul,
      isTranslation: true,
      hangul,
      alternativeHangulAnswers,
      picture: {
        type: "emojis",
        emojis: englishTimeString,
      },
    };
  },
};
