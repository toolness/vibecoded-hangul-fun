import { describe, it, expect } from "vitest";
import { makeEnglishTimeString, makeHangulForTime } from "./tellingTime";

describe("makeHangulForTime", () => {
  it("works", () => {
    expect(makeHangulForTime(3, 10)).toEqual({
      hangul: "세시 십분",
    });
    expect(makeHangulForTime(5, 25)).toEqual({
      hangul: "다섯시 이십오분",
    });
    expect(makeHangulForTime(8, 30)).toEqual({
      hangul: "여덟시 삼십분",
      alternativeHangulAnswers: ["여덟시 반"],
    });
    expect(makeHangulForTime(12, 45)).toEqual({
      hangul: "열두시 사십오분",
    });
    expect(makeHangulForTime(12, 0)).toEqual({
      hangul: "열두시",
    });
  });
});

describe("makeEnglishTimeString", () => {
  it("works", () => {
    expect(makeEnglishTimeString(1, 5)).toBe("1:05");
    expect(makeEnglishTimeString(12, 25)).toBe("12:25");
  });
});
