import { describe, it, expect } from "vitest";
import { quizReducer, createInitialState } from "./quizStateReducer";
import type { QuizState } from "./quizStateReducer";
import type { DatabaseRow } from "./database-spec";

describe("quizReducer", () => {
  const mockQuestion: DatabaseRow = {
    name: "hello",
    hangul: "안녕",
    url: "",
  };

  const mockQuestion2: DatabaseRow = {
    name: "goodbye",
    hangul: "안녕히",
    url: "",
  };

  it("should return initial state", () => {
    const initialState = createInitialState(mockQuestion);
    expect(initialState).toEqual({
      currentQuestion: mockQuestion,
      userInput: "",
      answeredQuestions: new Set(),
      incorrectQuestions: new Set(),
      showAnswer: false,
    });
  });

  describe("UPDATE_INPUT", () => {
    it("should update user input", () => {
      const initialState = createInitialState(mockQuestion);
      const result = quizReducer(initialState, {
        type: "UPDATE_INPUT",
        payload: "안",
      });
      expect(result.userInput).toBe("안");
    });

    it("should handle empty input", () => {
      const initialState = createInitialState(mockQuestion);
      const stateWithInput: QuizState = { ...initialState, userInput: "test" };
      const result = quizReducer(stateWithInput, {
        type: "UPDATE_INPUT",
        payload: "",
      });
      expect(result.userInput).toBe("");
    });
  });

  describe("MARK_CORRECT", () => {
    it("should add question to answered set", () => {
      const state = createInitialState(mockQuestion);
      const result = quizReducer(state, {
        type: "MARK_CORRECT",
        payload: mockQuestion,
      });
      expect(result.answeredQuestions.has(mockQuestion)).toBe(true);
      expect(result.incorrectQuestions.has(mockQuestion)).toBe(false);
    });

    it("should remove question from incorrect set if present", () => {
      const initialState = createInitialState(mockQuestion);
      const stateWithIncorrect: QuizState = {
        ...initialState,
        incorrectQuestions: new Set([mockQuestion]),
      };
      const result = quizReducer(stateWithIncorrect, {
        type: "MARK_CORRECT",
        payload: mockQuestion,
      });
      expect(result.answeredQuestions.has(mockQuestion)).toBe(true);
      expect(result.incorrectQuestions.has(mockQuestion)).toBe(false);
    });

    it("should preserve immutability of sets", () => {
      const state = createInitialState(mockQuestion);
      const result = quizReducer(state, {
        type: "MARK_CORRECT",
        payload: mockQuestion,
      });
      expect(result.answeredQuestions).not.toBe(state.answeredQuestions);
      expect(result.incorrectQuestions).not.toBe(state.incorrectQuestions);
    });
  });

  describe("MARK_INCORRECT", () => {
    it("should add question to both answered and incorrect sets", () => {
      const state = createInitialState(mockQuestion);
      const result = quizReducer(state, {
        type: "MARK_INCORRECT",
        payload: mockQuestion,
      });
      expect(result.answeredQuestions.has(mockQuestion)).toBe(true);
      expect(result.incorrectQuestions.has(mockQuestion)).toBe(true);
    });

    it("should preserve existing items in sets", () => {
      const existingQuestion: DatabaseRow = {
        name: "existing",
        hangul: "기존",
        url: "",
      };
      const initialState = createInitialState(mockQuestion);
      const stateWithAnswers: QuizState = {
        ...initialState,
        answeredQuestions: new Set([existingQuestion]),
        incorrectQuestions: new Set([existingQuestion]),
      };
      const result = quizReducer(stateWithAnswers, {
        type: "MARK_INCORRECT",
        payload: mockQuestion,
      });
      expect(result.answeredQuestions.has(existingQuestion)).toBe(true);
      expect(result.answeredQuestions.has(mockQuestion)).toBe(true);
      expect(result.incorrectQuestions.has(existingQuestion)).toBe(true);
      expect(result.incorrectQuestions.has(mockQuestion)).toBe(true);
    });
  });

  describe("SHOW_ANSWER", () => {
    it("should set showAnswer to true", () => {
      const initialState = createInitialState(mockQuestion);
      const result = quizReducer(initialState, {
        type: "SHOW_ANSWER",
      });
      expect(result.showAnswer).toBe(true);
    });

    it("should not affect other state properties", () => {
      const initialState = createInitialState(mockQuestion);
      const stateWithData: QuizState = {
        ...initialState,
        userInput: "test",
      };
      const result = quizReducer(stateWithData, {
        type: "SHOW_ANSWER",
      });
      expect(result.showAnswer).toBe(true);
      expect(result.currentQuestion).toEqual(mockQuestion);
      expect(result.userInput).toBe("test");
    });
  });

  describe("NEXT_QUESTION", () => {
    it("should set new question and reset input/showAnswer", () => {
      const initialState = createInitialState(mockQuestion);
      const stateWithData: QuizState = {
        ...initialState,
        userInput: "안녕",
        showAnswer: true,
      };
      const result = quizReducer(stateWithData, {
        type: "NEXT_QUESTION",
        payload: mockQuestion2,
      });
      expect(result.currentQuestion).toEqual(mockQuestion2);
      expect(result.userInput).toBe("");
      expect(result.showAnswer).toBe(false);
    });

    it("should preserve answered and incorrect questions", () => {
      const q1: DatabaseRow = { name: "q1", hangul: "하나", url: "" };
      const q2: DatabaseRow = { name: "q2", hangul: "둘", url: "" };
      const initialState = createInitialState(q1);
      const stateWithAnswers: QuizState = {
        ...initialState,
        answeredQuestions: new Set([q1, q2]),
        incorrectQuestions: new Set([q1]),
      };
      const result = quizReducer(stateWithAnswers, {
        type: "NEXT_QUESTION",
        payload: mockQuestion,
      });
      expect(result.answeredQuestions.size).toBe(2);
      expect(result.incorrectQuestions.size).toBe(1);
    });
  });

  describe("invalid action", () => {
    it("should return current state for unknown action type", () => {
      const initialState = createInitialState(mockQuestion);
      const result = quizReducer(initialState, {
        // @ts-expect-error - Testing invalid action
        type: "INVALID_ACTION",
      });
      expect(result).toBe(initialState);
    });
  });

  describe("complex scenarios", () => {
    it("should handle multiple state transitions", () => {
      let state = createInitialState(mockQuestion2);

      // User types incorrect answer
      state = quizReducer(state, {
        type: "UPDATE_INPUT",
        payload: "가나",
      });

      // User gives up
      state = quizReducer(state, {
        type: "SHOW_ANSWER",
      });

      // Mark as incorrect
      state = quizReducer(state, {
        type: "MARK_INCORRECT",
        payload: mockQuestion,
      });

      // Move to next question
      state = quizReducer(state, {
        type: "NEXT_QUESTION",
        payload: mockQuestion2,
      });

      expect(state.currentQuestion).toEqual(mockQuestion2);
      expect(state.userInput).toBe("");
      expect(state.showAnswer).toBe(false);
      expect(state.answeredQuestions.has(mockQuestion)).toBe(true);
      expect(state.incorrectQuestions.has(mockQuestion)).toBe(true);
    });
  });
});
