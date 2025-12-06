import { describe, it, expect } from "vitest";
import { quizReducer, createInitialState } from "./quizStateReducer";
import type { QuizState } from "./quizStateReducer";
import type { AppCard } from "./AppCard";
import { createTestAppCard } from "./test/testHelpers";

describe("quizReducer", () => {
  const mockQuestion: AppCard = createTestAppCard({
    id: "test-id-1",
    name: "hello",
    hangul: "안녕",
    createdTime: "2025-12-06T16:11:00.000Z",
  });

  const mockQuestion2: AppCard = createTestAppCard({
    id: "test-id-2",
    name: "goodbye",
    hangul: "안녕히",
    createdTime: "2025-11-06T16:11:00.000Z",
  });

  const mockQuestions = [mockQuestion, mockQuestion2];

  it("should return initial state", () => {
    const initialState = createInitialState(mockQuestions);
    expect(initialState.userInput).toBe("");
    expect(initialState.showAnswer).toBe(false);
    expect(initialState.mode).toBe("translate");
    expect(initialState.allQuestions).toEqual(mockQuestions);
    expect(initialState.allQuestionsFiltered).toEqual(mockQuestions);
    // Current question should be one of the mock questions
    expect(mockQuestions).toContainEqual(initialState.currentQuestion);
    // Remaining questions should have the other question
    expect(initialState.remainingQuestions.length).toBe(1);
  });

  describe("UPDATE_INPUT", () => {
    it("should update user input", () => {
      const initialState = createInitialState(mockQuestions);
      const result = quizReducer(initialState, {
        type: "UPDATE_INPUT",
        input: "안",
      });
      expect(result.userInput).toBe("안");
    });

    it("should handle empty input", () => {
      const initialState = createInitialState(mockQuestions);
      const stateWithInput: QuizState = { ...initialState, userInput: "test" };
      const result = quizReducer(stateWithInput, {
        type: "UPDATE_INPUT",
        input: "",
      });
      expect(result.userInput).toBe("");
    });
  });

  describe("SET_QUESTION", () => {
    it("should set a specific question", () => {
      const state = createInitialState(mockQuestions);
      const result = quizReducer(state, {
        type: "SET_QUESTION",
        question: mockQuestion2,
      });
      expect(result.currentQuestion).toBe(mockQuestion2);
      expect(result.userInput).toBe("");
      expect(result.showAnswer).toBe(false);
    });

    it("should reset user input and showAnswer", () => {
      const initialState = createInitialState(mockQuestions);
      const stateWithData: QuizState = {
        ...initialState,
        userInput: "test",
        showAnswer: true,
      };
      const result = quizReducer(stateWithData, {
        type: "SET_QUESTION",
        question: mockQuestion,
      });
      expect(result.currentQuestion).toBe(mockQuestion);
      expect(result.userInput).toBe("");
      expect(result.showAnswer).toBe(false);
    });
  });

  describe("SHOW_ANSWER", () => {
    it("should set showAnswer to true", () => {
      const initialState = createInitialState(mockQuestions);
      const result = quizReducer(initialState, {
        type: "SHOW_ANSWER",
      });
      expect(result.showAnswer).toBe(true);
    });

    it("should not affect other state properties", () => {
      const initialState = createInitialState(mockQuestions);
      const originalQuestion = initialState.currentQuestion;
      const stateWithData: QuizState = {
        ...initialState,
        userInput: "test",
      };
      const result = quizReducer(stateWithData, {
        type: "SHOW_ANSWER",
      });
      expect(result.showAnswer).toBe(true);
      expect(result.currentQuestion).toEqual(originalQuestion);
      expect(result.userInput).toBe("test");
    });
  });

  describe("NEXT_QUESTION", () => {
    it("should move to next question from remaining questions", () => {
      const q1: AppCard = createTestAppCard({
        id: "test-id-q1",
        name: "q1",
        hangul: "하나",
      });
      const q2: AppCard = createTestAppCard({
        id: "test-id-q2",
        name: "q2",
        hangul: "둘",
      });
      const q3: AppCard = createTestAppCard({
        id: "test-id-q3",
        name: "q3",
        hangul: "셋",
      });
      const questions = [q1, q2, q3];
      const initialState = createInitialState(questions);
      const beforeLength = initialState.remainingQuestions.length;

      const result = quizReducer(initialState, {
        type: "NEXT_QUESTION",
      });

      expect(result.remainingQuestions.length).toBe(beforeLength - 1);
      expect(result.userInput).toBe("");
      expect(result.showAnswer).toBe(false);
    });

    it("should restart when no remaining questions", () => {
      const questions = [mockQuestion, mockQuestion2];
      const initialState = createInitialState(questions);
      // Empty the remaining questions
      const stateWithNoRemaining: QuizState = {
        ...initialState,
        remainingQuestions: [],
      };

      const result = quizReducer(stateWithNoRemaining, {
        type: "NEXT_QUESTION",
      });

      // Should have reset with all questions
      expect(result.allQuestionsFiltered.length).toBe(2);
      expect(result.remainingQuestions.length).toBe(1);
      expect(questions).toContainEqual(result.currentQuestion);
    });
  });

  describe("invalid action", () => {
    it("should return current state for unknown action type", () => {
      const initialState = createInitialState(mockQuestions);
      const result = quizReducer(initialState, {
        // @ts-expect-error - Testing invalid action
        type: "INVALID_ACTION",
      });
      expect(result).toBe(initialState);
    });
  });

  describe("SET_OPTIONS", () => {
    it("should not set unspecified options", () => {
      const initialState = createInitialState(mockQuestions, {
        mode: "minimalpair",
        category: "mycategory",
      });
      const result = quizReducer(initialState, {
        type: "SET_OPTIONS",
        mode: "typingtutor",
      });
      expect(result.mode).toBe("typingtutor");
      expect(result.category).toBe("mycategory");
    });

    it("should not set options explicitly set to undefined", () => {
      const initialState = createInitialState(mockQuestions, {
        mode: "minimalpair",
        category: "mycategory",
      });
      const result = quizReducer(initialState, {
        type: "SET_OPTIONS",
        mode: "typingtutor",
        category: "myothercategory",
      });
      expect(result.mode).toBe("typingtutor");
      expect(result.category).toBe("myothercategory");
    });

    it("should respect maxQuestions", () => {
      const initialState = createInitialState(mockQuestions);
      const result = quizReducer(initialState, {
        type: "SET_OPTIONS",
        maxQuestions: 1,
      });
      expect(result.allQuestions).toHaveLength(mockQuestions.length);
      expect(result.currentQuestion).toBe(mockQuestions[0]);
      expect(result.remainingQuestions).toHaveLength(0);
    });

    it("should set mode to typingtutor", () => {
      const initialState = createInitialState(mockQuestions);
      const result = quizReducer(initialState, {
        type: "SET_OPTIONS",
        mode: "typingtutor",
      });
      expect(result.mode).toBe("typingtutor");
    });

    it("should set mode to translate", () => {
      const initialState = createInitialState(mockQuestions, {
        mode: "typingtutor",
      });
      const result = quizReducer(initialState, {
        type: "SET_OPTIONS",
        mode: "translate",
      });
      expect(result.mode).toBe("translate");
    });

    it("should reset state when changing mode", () => {
      const initialState = createInitialState(mockQuestions);
      const stateWithData: QuizState = {
        ...initialState,
        userInput: "test",
        showAnswer: true,
      };
      const result = quizReducer(stateWithData, {
        type: "SET_OPTIONS",
        mode: "typingtutor",
      });
      expect(result.mode).toBe("typingtutor");
      // State should be reset
      expect(result.userInput).toBe("");
      expect(result.showAnswer).toBe(false);
      // Should have new shuffled questions
      expect(result.allQuestionsFiltered).toEqual(mockQuestions);
    });
  });

  describe("complex scenarios", () => {
    it("should handle multiple state transitions", () => {
      let state = createInitialState(mockQuestions);

      // User types incorrect answer
      state = quizReducer(state, {
        type: "UPDATE_INPUT",
        input: "가나",
      });

      expect(state.userInput).toBe("가나");

      // User gives up
      state = quizReducer(state, {
        type: "SHOW_ANSWER",
      });

      expect(state.showAnswer).toBe(true);

      // Move to next question
      const prevQuestion = state.currentQuestion;
      state = quizReducer(state, {
        type: "NEXT_QUESTION",
      });

      expect(state.userInput).toBe("");
      expect(state.showAnswer).toBe(false);
      // Should have moved to a different question (or restarted)
      if (state.remainingQuestions.length > 0) {
        expect(state.currentQuestion).not.toBe(prevQuestion);
      }
    });
  });
});
