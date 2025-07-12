import { describe, it, expect } from "vitest";
import { quizReducer, initialState } from "./quizStateReducer";
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
    expect(initialState).toEqual({
      currentQuestion: null,
      userInput: "",
      answeredQuestions: new Set(),
      incorrectQuestions: new Set(),
      showAnswer: false,
    });
  });

  describe("SET_QUESTION", () => {
    it("should set the current question", () => {
      const result = quizReducer(initialState, {
        type: "SET_QUESTION",
        payload: mockQuestion,
      });
      expect(result.currentQuestion).toEqual(mockQuestion);
      expect(result).not.toBe(initialState); // Ensure immutability
    });
  });

  describe("UPDATE_INPUT", () => {
    it("should update user input", () => {
      const result = quizReducer(initialState, {
        type: "UPDATE_INPUT",
        payload: "안",
      });
      expect(result.userInput).toBe("안");
    });

    it("should handle empty input", () => {
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
      const result = quizReducer(initialState, {
        type: "MARK_CORRECT",
        payload: "hello",
      });
      expect(result.answeredQuestions.has("hello")).toBe(true);
      expect(result.incorrectQuestions.has("hello")).toBe(false);
    });

    it("should remove question from incorrect set if present", () => {
      const stateWithIncorrect: QuizState = {
        ...initialState,
        incorrectQuestions: new Set(["hello"]),
      };
      const result = quizReducer(stateWithIncorrect, {
        type: "MARK_CORRECT",
        payload: "hello",
      });
      expect(result.answeredQuestions.has("hello")).toBe(true);
      expect(result.incorrectQuestions.has("hello")).toBe(false);
    });

    it("should preserve immutability of sets", () => {
      const result = quizReducer(initialState, {
        type: "MARK_CORRECT",
        payload: "hello",
      });
      expect(result.answeredQuestions).not.toBe(initialState.answeredQuestions);
      expect(result.incorrectQuestions).not.toBe(
        initialState.incorrectQuestions,
      );
    });
  });

  describe("MARK_INCORRECT", () => {
    it("should add question to both answered and incorrect sets", () => {
      const result = quizReducer(initialState, {
        type: "MARK_INCORRECT",
        payload: "hello",
      });
      expect(result.answeredQuestions.has("hello")).toBe(true);
      expect(result.incorrectQuestions.has("hello")).toBe(true);
    });

    it("should preserve existing items in sets", () => {
      const stateWithAnswers: QuizState = {
        ...initialState,
        answeredQuestions: new Set(["existing"]),
        incorrectQuestions: new Set(["existing"]),
      };
      const result = quizReducer(stateWithAnswers, {
        type: "MARK_INCORRECT",
        payload: "hello",
      });
      expect(result.answeredQuestions.has("existing")).toBe(true);
      expect(result.answeredQuestions.has("hello")).toBe(true);
      expect(result.incorrectQuestions.has("existing")).toBe(true);
      expect(result.incorrectQuestions.has("hello")).toBe(true);
    });
  });

  describe("SHOW_ANSWER", () => {
    it("should set showAnswer to true", () => {
      const result = quizReducer(initialState, {
        type: "SHOW_ANSWER",
      });
      expect(result.showAnswer).toBe(true);
    });

    it("should not affect other state properties", () => {
      const stateWithData: QuizState = {
        ...initialState,
        currentQuestion: mockQuestion,
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
      const stateWithData: QuizState = {
        ...initialState,
        currentQuestion: mockQuestion,
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
      const stateWithAnswers: QuizState = {
        ...initialState,
        answeredQuestions: new Set(["q1", "q2"]),
        incorrectQuestions: new Set(["q1"]),
      };
      const result = quizReducer(stateWithAnswers, {
        type: "NEXT_QUESTION",
        payload: mockQuestion,
      });
      expect(result.answeredQuestions.size).toBe(2);
      expect(result.incorrectQuestions.size).toBe(1);
    });
  });

  describe("RESET_FOR_NEXT", () => {
    it("should reset input and showAnswer but keep current question", () => {
      const stateWithData: QuizState = {
        ...initialState,
        currentQuestion: mockQuestion,
        userInput: "안녕",
        showAnswer: true,
      };
      const result = quizReducer(stateWithData, {
        type: "RESET_FOR_NEXT",
      });
      expect(result.currentQuestion).toEqual(mockQuestion);
      expect(result.userInput).toBe("");
      expect(result.showAnswer).toBe(false);
    });
  });

  describe("invalid action", () => {
    it("should return current state for unknown action type", () => {
      const result = quizReducer(initialState, {
        // @ts-expect-error - Testing invalid action
        type: "INVALID_ACTION",
      });
      expect(result).toBe(initialState);
    });
  });

  describe("complex scenarios", () => {
    it("should handle multiple state transitions", () => {
      let state = initialState;

      // Set initial question
      state = quizReducer(state, {
        type: "SET_QUESTION",
        payload: mockQuestion,
      });

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
        payload: mockQuestion.name,
      });

      // Move to next question
      state = quizReducer(state, {
        type: "NEXT_QUESTION",
        payload: mockQuestion2,
      });

      expect(state.currentQuestion).toEqual(mockQuestion2);
      expect(state.userInput).toBe("");
      expect(state.showAnswer).toBe(false);
      expect(state.answeredQuestions.has("hello")).toBe(true);
      expect(state.incorrectQuestions.has("hello")).toBe(true);
    });
  });
});
