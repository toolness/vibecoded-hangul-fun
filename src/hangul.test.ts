import { describe, it, expect } from "vitest";
import {
  HangulCharClass,
  HangulCharClassStatic,
  decompose_hangul_syllable_to_jamos,
  decompose_all_hangul_syllables,
  hangul_jamo_to_compat,
  hangul_jamo_to_compat_with_fallback,
} from "./hangul";

describe("HangulCharClass", () => {
  it("should correctly classify characters", () => {
    expect(HangulCharClassStatic.from("이")).toBe(HangulCharClass.Syllables);
    expect(HangulCharClassStatic.from("ᆸ")).toBe(HangulCharClass.Jamo);
    expect(HangulCharClassStatic.from("ㄱ")).toBe(
      HangulCharClass.CompatibilityJamo,
    );
    expect(HangulCharClassStatic.from("h")).toBe(HangulCharClass.None);
    expect(HangulCharClassStatic.from("")).toBe(HangulCharClass.None);
  });

  it("should split strings by character class", () => {
    expect(HangulCharClassStatic.split("")).toEqual([]);

    expect(HangulCharClassStatic.split("이")).toEqual([
      [HangulCharClass.Syllables, "이"],
    ]);

    expect(HangulCharClassStatic.split("hi 이 there")).toEqual([
      [HangulCharClass.None, "hi "],
      [HangulCharClass.Syllables, "이"],
      [HangulCharClass.None, " there"],
    ]);
  });
});

describe("decompose_hangul_syllable_to_jamos", () => {
  it("should return null for non-Hangul syllables", () => {
    expect(decompose_hangul_syllable_to_jamos("h")).toBeNull();
    expect(decompose_hangul_syllable_to_jamos("")).toBeNull();
  });

  it("should decompose Hangul syllables without final consonant", () => {
    const result = decompose_hangul_syllable_to_jamos("이");
    expect(result).toEqual(["ᄋ", "ᅵ", undefined]);
  });

  it("should decompose Hangul syllables with final consonant", () => {
    const result = decompose_hangul_syllable_to_jamos("는");
    expect(result).toEqual(["ᄂ", "ᅳ", "ᆫ"]);
  });
});

describe("decompose_all_hangul_syllables", () => {
  it("should decompose all Hangul syllables in a string", () => {
    const orig = "이";
    expect(orig.length).toBe(1);

    const decomposed = decompose_all_hangul_syllables(orig);
    expect(decomposed).toBe("이");
    expect(decomposed.length).toBe(2);
  });

  it("should preserve non-Hangul characters", () => {
    expect(decompose_all_hangul_syllables("hi 이 there")).toBe("hi 이 there");
  });

  it("should handle empty strings", () => {
    expect(decompose_all_hangul_syllables("")).toBe("");
  });
});

describe("hangul_jamo_to_compat", () => {
  it("should convert Jamo to Compatibility Jamo", () => {
    // Consonants
    expect(hangul_jamo_to_compat("ᄀ")).toBe("ㄱ");
    expect(hangul_jamo_to_compat("ᆨ")).toBe("ㄱ");
    expect(hangul_jamo_to_compat("ᄂ")).toBe("ㄴ");
    expect(hangul_jamo_to_compat("ᆫ")).toBe("ㄴ");

    // Vowels
    expect(hangul_jamo_to_compat("ᅡ")).toBe("ㅏ");
    expect(hangul_jamo_to_compat("ᅵ")).toBe("ㅣ");
  });

  it("should return null for non-convertible characters", () => {
    expect(hangul_jamo_to_compat("h")).toBeNull();
    expect(hangul_jamo_to_compat("이")).toBeNull();
  });
});

describe("hangul_jamo_to_compat_with_fallback", () => {
  it("should convert when possible", () => {
    expect(hangul_jamo_to_compat_with_fallback("ᄀ")).toBe("ㄱ");
  });

  it("should return original character when conversion not possible", () => {
    expect(hangul_jamo_to_compat_with_fallback("h")).toBe("h");
    expect(hangul_jamo_to_compat_with_fallback("이")).toBe("이");
  });
});
