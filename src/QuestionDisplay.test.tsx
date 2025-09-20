import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import QuestionDisplay from "./QuestionDisplay";
import type { DatabaseRow } from "./database-spec";
import { createTestDatabaseRow } from "./test/testHelpers";

describe("QuestionDisplay", () => {
  const mockQuestionWithUrl: DatabaseRow = createTestDatabaseRow({
    id: "test-id-1",
    name: "hello",
    hangul: "안녕하세요",
    url: "https://example.com",
  });

  const mockQuestionWithoutUrl: DatabaseRow = createTestDatabaseRow({
    id: "test-id-2",
    name: "goodbye",
    hangul: "안녕히 가세요",
  });

  const mockQuestionWithEmoji: DatabaseRow = createTestDatabaseRow({
    id: "test-id-3",
    name: "smile",
    hangul: "미소",
    picture: { type: "emojis", emojis: "😊" },
  });

  const mockQuestionWithImage: DatabaseRow = createTestDatabaseRow({
    id: "test-id-4",
    name: "cat",
    hangul: "고양이",
    picture: { type: "local-image", filename: "cat.png" },
  });

  describe("Normal mode", () => {
    it("should display romanized text as a link when URL is available", () => {
      render(
        <QuestionDisplay
          currentQuestion={mockQuestionWithUrl}
          mode="translate"
          vocalizer={null}
        />,
      );

      const link = screen.getByTestId("question-name");
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", "https://example.com");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveTextContent("hello");
      expect(link).toHaveClass("question-link");
    });

    it("should display romanized text as span when no URL", () => {
      render(
        <QuestionDisplay
          currentQuestion={mockQuestionWithoutUrl}
          mode="translate"
          vocalizer={null}
        />,
      );

      const span = screen.getByTestId("question-name");
      expect(span.tagName).toBe("SPAN");
      expect(span).toHaveTextContent("goodbye");
      expect(span).toHaveClass("question-text");
    });
  });

  describe("Typing tutor mode", () => {
    it("should display Hangul text as a link when URL is available", () => {
      render(
        <QuestionDisplay
          currentQuestion={mockQuestionWithUrl}
          mode="typingtutor"
          vocalizer={null}
        />,
      );

      const link = screen.getByTestId("question-name");
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", "https://example.com");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveTextContent("안녕하세요");
      expect(link).toHaveClass("question-link");
    });

    it("should display Hangul text as span when no URL", () => {
      render(
        <QuestionDisplay
          currentQuestion={mockQuestionWithoutUrl}
          mode="typingtutor"
          vocalizer={null}
        />,
      );

      const span = screen.getByTestId("question-name");
      expect(span.tagName).toBe("SPAN");
      expect(span).toHaveTextContent("안녕히 가세요");
      expect(span).toHaveClass("question-text");
    });
  });

  describe("Picture mode", () => {
    it("should display emoji when picture type is emoji", () => {
      render(
        <QuestionDisplay
          currentQuestion={mockQuestionWithEmoji}
          mode="picture"
          vocalizer={null}
        />,
      );

      const emojiElement = screen.getByText("😊");
      expect(emojiElement).toHaveClass("question-picture");
      expect(emojiElement).toHaveClass("question-emojis");
      expect(emojiElement.tagName).toBe("SPAN");
    });

    it("should display image when picture type is local-image", () => {
      render(
        <QuestionDisplay
          currentQuestion={mockQuestionWithImage}
          mode="picture"
          vocalizer={null}
        />,
      );

      const imageElement = screen.getByRole("img");
      expect(imageElement).toHaveClass("question-picture");
      expect(imageElement).toHaveAttribute("src");
    });
  });

  describe("Speaker icon", () => {
    it("should show speaker icon when speech is supported", () => {
      render(
        <QuestionDisplay
          currentQuestion={mockQuestionWithUrl}
          mode="translate"
          vocalizer={() => {}}
        />,
      );

      const speakerIcon = screen.getByRole("img");
      expect(speakerIcon).toHaveClass("speaker-icon");
    });

    it("should not show speaker icon when speech is not supported", () => {
      render(
        <QuestionDisplay
          currentQuestion={mockQuestionWithUrl}
          mode="translate"
          vocalizer={null}
        />,
      );

      const speakerIcon = screen.queryByRole("img");
      expect(speakerIcon).not.toBeInTheDocument();
    });
  });
});
