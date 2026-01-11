import type { DynamicCardFactory } from "../DynamicCard";
import { EMPTY_QUESTION } from "../quizStateReducer";
import { getRandomInt } from "../util";
import { makeSinoKoreanNumber } from "./sinoKoreanNumber";

export function makeMonthHangul(month: number): string | undefined {
  if (month < 1 || month > 12) {
    return undefined;
  }
  // June and October have irregular pronunciations
  if (month === 6) {
    return "유";
  }
  if (month === 10) {
    return "시";
  }
  return makeSinoKoreanNumber(month);
}

export function makeHangulForDate(
  month: number,
  day: number,
): { hangul: string; alternativeHangulAnswers: string[] } | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }

  const monthHangul = makeMonthHangul(month);
  const dayHangul = makeSinoKoreanNumber(day);

  if (!monthHangul || !dayHangul) {
    return undefined;
  }

  const hangul = `${monthHangul}월 ${dayHangul}일`;

  return {
    hangul,
    alternativeHangulAnswers: [`${month}월 ${day}일`],
  };
}

export function makeEnglishDateString(month: number, day: number): string {
  return `${month}/${day}`;
}

export const TellingDateDynamicCard: DynamicCardFactory = {
  category: "Special: Date",
  create() {
    const month = getRandomInt(1, 12);
    const day = getRandomInt(1, 28);
    const result = makeHangulForDate(month, day);
    const englishDateString = makeEnglishDateString(month, day);

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
        emojis: englishDateString,
      },
    };
  },
};
