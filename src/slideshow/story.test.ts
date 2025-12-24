import { describe, it, expect } from "vitest";
import { parseStory } from "./story";

describe("parseStory", () => {
  it("returns empty text and mapping for empty input", () => {
    const result = parseStory("");
    expect(result.text).toBe("");
    expect(result.vocabularyMapping).toEqual({});
  });

  it("returns text unchanged when no annotations present", () => {
    const input = "# 할아버지의 생일\n\n안녕하세요!";
    const result = parseStory(input);
    expect(result.text).toBe(input);
    expect(result.vocabularyMapping).toEqual({});
  });

  it("parses a single annotation", () => {
    const input = "옛날에 (옛날) 살았습니다.";
    const result = parseStory(input);
    expect(result.text).toBe("옛날에 살았습니다.");
    expect(result.vocabularyMapping).toEqual({
      옛날에: ["옛날"],
    });
  });

  it("parses multiple annotations on one line", () => {
    const input = "작은 (작다) 마을에 (마을) 소녀가 (소녀) 살았습니다 (살다).";
    const result = parseStory(input);
    expect(result.text).toBe("작은 마을에 소녀가 살았습니다.");
    expect(result.vocabularyMapping).toEqual({
      작은: ["작다"],
      마을에: ["마을"],
      소녀가: ["소녀"],
      살았습니다: ["살다"],
    });
  });

  it("parses comma-separated vocab words (compound verbs)", () => {
    const input = "뛰어왔습니다 (뛰다, 오다).";
    const result = parseStory(input);
    expect(result.text).toBe("뛰어왔습니다.");
    expect(result.vocabularyMapping).toEqual({
      뛰어왔습니다: ["뛰다", "오다"],
    });
  });

  it("handles punctuation before the word", () => {
    const input = '"생일 (생일) 축하해요 (축하)!" 민지가 말했습니다 (말하다).';
    const result = parseStory(input);
    expect(result.text).toBe('"생일 축하해요!" 민지가 말했습니다.');
    expect(result.vocabularyMapping).toEqual({
      생일: ["생일"],
      축하해요: ["축하"],
      말했습니다: ["말하다"],
    });
  });

  it("handles punctuation after the annotation", () => {
    const input = "드디어 도착했습니다 (도착)! 할아버지가 (할아버지) 왔어요.";
    const result = parseStory(input);
    expect(result.text).toBe("드디어 도착했습니다! 할아버지가 왔어요.");
    expect(result.vocabularyMapping).toEqual({
      도착했습니다: ["도착"],
      할아버지가: ["할아버지"],
    });
  });

  it("preserves newlines and formatting", () => {
    const input = `# 제목

첫 번째 줄 (줄).

두 번째 줄 (줄).`;
    const result = parseStory(input);
    expect(result.text).toBe(`# 제목

첫 번째 줄.

두 번째 줄.`);
    expect(result.vocabularyMapping).toEqual({
      줄: ["줄"],
    });
  });

  it("handles the same word appearing multiple times with same vocab", () => {
    const input = "하늘에 (하늘) 구름이 있었습니다. 하늘을 (하늘) 보았습니다.";
    const result = parseStory(input);
    expect(result.text).toBe("하늘에 구름이 있었습니다. 하늘을 보았습니다.");
    // The second occurrence overwrites the first, but both map to the same vocab
    expect(result.vocabularyMapping["하늘에"]).toEqual(["하늘"]);
    expect(result.vocabularyMapping["하늘을"]).toEqual(["하늘"]);
  });

  it("parses a multi-line story excerpt", () => {
    const input = `옛날에 (옛날) 작은 (작다) 마을에 (마을) 소녀가 (소녀) 살았습니다 (살다). 소녀의 이름은 (이름) 민지였습니다 (이다). 민지는 할아버지를 (할아버지) 아주 (아주) 좋아했습니다 (좋아하다).

오늘은 (오늘) 할아버지의 (할아버지) 생일이었습니다 (생일).`;

    const result = parseStory(input);

    expect(result.text).toBe(
      `옛날에 작은 마을에 소녀가 살았습니다. 소녀의 이름은 민지였습니다. 민지는 할아버지를 아주 좋아했습니다.

오늘은 할아버지의 생일이었습니다.`,
    );

    expect(result.vocabularyMapping).toEqual({
      옛날에: ["옛날"],
      작은: ["작다"],
      마을에: ["마을"],
      소녀가: ["소녀"],
      살았습니다: ["살다"],
      이름은: ["이름"],
      민지였습니다: ["이다"],
      할아버지를: ["할아버지"],
      아주: ["아주"],
      좋아했습니다: ["좋아하다"],
      오늘은: ["오늘"],
      할아버지의: ["할아버지"],
      생일이었습니다: ["생일"],
    });
  });

  it("strips non-Hangul characters from mapping keys", () => {
    const input = '..."사랑해요 (사랑하다)!"';
    const result = parseStory(input);
    expect(result.vocabularyMapping).toEqual({
      사랑해요: ["사랑하다"],
    });
  });

  it("handles words with only punctuation (no Hangul) gracefully", () => {
    // Edge case: if somehow a non-Hangul word gets annotated, skip it
    const input = "123 (숫자) hello";
    const result = parseStory(input);
    expect(result.text).toBe("123 hello");
    // No mapping since "123" has no Hangul
    expect(result.vocabularyMapping).toEqual({});
  });
});
