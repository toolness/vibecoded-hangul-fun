import { describe, it, expect } from "vitest";
import { makeSinoKoreanNumber } from "./sinoKoreanNumber";

type TestCase = { number: number; hangul: string | undefined };

const TEST_CASES: TestCase[] = [
  // Invalid/unsupported
  { number: -1, hangul: undefined },
  { number: 1_000_000, hangul: undefined },

  // Valid
  { number: 1, hangul: "일" },
  { number: 10, hangul: "십" },
  { number: 11, hangul: "십일" },
  { number: 20, hangul: "이십" },
  { number: 23, hangul: "이십삼" },
  { number: 100, hangul: "백" },
  { number: 200, hangul: "이백" },
  { number: 845, hangul: "팔백 사십오" },
  { number: 760, hangul: "칠백 육십" },
  { number: 1000, hangul: "천" },
  { number: 2000, hangul: "이천" },
  { number: 2500, hangul: "이천 오백" },
  { number: 5300, hangul: "오천 삼백" },
  { number: 9250, hangul: "구천 이백 오십" },
  { number: 10_000, hangul: "만" },
  { number: 25_000, hangul: "이만 오천" },
  { number: 56_000, hangul: "오만 육천" },
  { number: 83_500, hangul: "팔만 삼천 오백" },
  { number: 91_000, hangul: "구만 천" },
  { number: 100_000, hangul: "십만" },
  { number: 400_000, hangul: "사십만" },
  { number: 550_000, hangul: "오십오만" },
];

describe("makeSinoKoreanNumber", () => {
  for (const { number, hangul } of TEST_CASES) {
    const expected =
      hangul === undefined ? "undefined" : JSON.stringify(hangul);

    it(`converts ${number} to ${expected}`, () => {
      expect(makeSinoKoreanNumber(number)).toBe(hangul);
    });
  }
});
