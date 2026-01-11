import { describe, it, expect } from "vitest";
import {
  makeEnglishDateString,
  makeHangulForDate,
  makeMonthHangul,
} from "./tellingDate";

describe("makeMonthHangul", () => {
  it("returns undefined for invalid months", () => {
    expect(makeMonthHangul(0)).toBeUndefined();
    expect(makeMonthHangul(13)).toBeUndefined();
  });

  it("uses 유 for June instead of 육", () => {
    expect(makeMonthHangul(6)).toBe("유");
  });

  it("uses 시 for October instead of 십", () => {
    expect(makeMonthHangul(10)).toBe("시");
  });

  it("uses regular sino-Korean numbers for other months", () => {
    expect(makeMonthHangul(1)).toBe("일");
    expect(makeMonthHangul(12)).toBe("십이");
  });
});

describe("makeHangulForDate", () => {
  it("works for single digit months and days", () => {
    expect(makeHangulForDate(1, 1)).toEqual({
      hangul: "일월 일일",
      alternativeHangulAnswers: ["1월 1일"],
    });
    expect(makeHangulForDate(3, 5)).toEqual({
      hangul: "삼월 오일",
      alternativeHangulAnswers: ["3월 5일"],
    });
  });

  it("uses irregular pronunciations for June and October", () => {
    expect(makeHangulForDate(6, 15)).toEqual({
      hangul: "유월 십오일",
      alternativeHangulAnswers: ["6월 15일"],
    });
    expect(makeHangulForDate(10, 15)).toEqual({
      hangul: "시월 십오일",
      alternativeHangulAnswers: ["10월 15일"],
    });
  });

  it("works for double digit months and days", () => {
    expect(makeHangulForDate(11, 15)).toEqual({
      hangul: "십일월 십오일",
      alternativeHangulAnswers: ["11월 15일"],
    });
    expect(makeHangulForDate(12, 25)).toEqual({
      hangul: "십이월 이십오일",
      alternativeHangulAnswers: ["12월 25일"],
    });
  });

  it("works for the last day of the month", () => {
    expect(makeHangulForDate(1, 31)).toEqual({
      hangul: "일월 삼십일일",
      alternativeHangulAnswers: ["1월 31일"],
    });
  });

  it("returns undefined for invalid months", () => {
    expect(makeHangulForDate(0, 1)).toBeUndefined();
    expect(makeHangulForDate(13, 1)).toBeUndefined();
  });

  it("returns undefined for invalid days", () => {
    expect(makeHangulForDate(1, 0)).toBeUndefined();
    expect(makeHangulForDate(1, 32)).toBeUndefined();
  });
});

describe("makeEnglishDateString", () => {
  it("works", () => {
    expect(makeEnglishDateString(1, 5)).toBe("1/5");
    expect(makeEnglishDateString(12, 25)).toBe("12/25");
  });
});
