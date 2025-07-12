import { describe, it, expect } from "vitest";
import { calculateCorrectJamos } from "./calculateCorrectJamos";

describe("calculateCorrectJamos", () => {
  it("should handle empty correct hangul string", () => {
    const result = calculateCorrectJamos("", "안녕");
    expect(result).toEqual({ correct: 0, total: 0 });
  });

  it("should return correct count when user input matches exactly", () => {
    const result = calculateCorrectJamos("안녕", "안녕");
    expect(result.correct).toBe(6); // ㅇㅏㄴㄴㅕㅇ
    expect(result.total).toBe(6);
  });

  it("should count partial matches from the beginning", () => {
    const result = calculateCorrectJamos("안녕", "안");
    expect(result.correct).toBe(3); // ㅇㅏㄴ
    expect(result.total).toBe(6);
  });

  it("should count partial matches that are still being composed (compatibility unicode)", () => {
    const result = calculateCorrectJamos("안녕", "ㅇ");
    expect(result.correct).toBe(1);
    expect(result.total).toBe(6);
  });

  it("should count partial matches that are still being composed (jamo unicode)", () => {
    const result = calculateCorrectJamos("안녕", "ᄋ");
    expect(result.correct).toBe(1);
    expect(result.total).toBe(6);
  });

  it("should stop counting at first incorrect jamo", () => {
    const result = calculateCorrectJamos("안녕", "아녕");
    expect(result.correct).toBe(3); // ㅇㅏ match, then final ㄴ of 안 doesn't match first ㄴ of 녕
    expect(result.total).toBe(6);
  });

  it("should handle empty user input", () => {
    const result = calculateCorrectJamos("안녕", "");
    expect(result.correct).toBe(0);
    expect(result.total).toBe(6);
  });

  it("should handle user input longer than correct answer", () => {
    const result = calculateCorrectJamos("안", "안녕하세요");
    expect(result.correct).toBe(3); // ㅇㅏㄴ (only counts up to length of correct answer)
    expect(result.total).toBe(3);
  });

  it("should handle syllables with final consonants", () => {
    const result = calculateCorrectJamos("좋은", "좋은");
    expect(result.correct).toBe(6); // ㅈㅗㅎㅇㅡㄴ
    expect(result.total).toBe(6);
  });

  it("should handle partial match with final consonants", () => {
    const result = calculateCorrectJamos("좋은", "좋");
    expect(result.correct).toBe(3); // ㅈㅗㅎ
    expect(result.total).toBe(6);
  });

  it("should handle completely wrong input", () => {
    const result = calculateCorrectJamos("안녕", "가나");
    expect(result.correct).toBe(0); // First jamo doesn't match
    expect(result.total).toBe(6);
  });

  it("should handle longer words", () => {
    const result = calculateCorrectJamos("테스트", "테스트");
    expect(result.correct).toBe(6); // ㅌㅔㅅㅡㅌㅡ
    expect(result.total).toBe(6);
  });
});
