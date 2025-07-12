import type { DatabaseRow } from "./database-spec";

export interface QuizState {
  currentQuestion: DatabaseRow | null;
  userInput: string;
  answeredQuestions: Set<string>;
  incorrectQuestions: Set<string>;
  showAnswer: boolean;
}

export const initialState: QuizState = {
  currentQuestion: null,
  userInput: "",
  answeredQuestions: new Set(),
  incorrectQuestions: new Set(),
  showAnswer: false,
};

export type QuizAction =
  | { type: "SET_QUESTION"; payload: DatabaseRow }
  | { type: "UPDATE_INPUT"; payload: string }
  | { type: "MARK_CORRECT"; payload: string }
  | { type: "MARK_INCORRECT"; payload: string }
  | { type: "SHOW_ANSWER" }
  | { type: "NEXT_QUESTION"; payload: DatabaseRow }
  | { type: "RESET_FOR_NEXT" };

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "SET_QUESTION":
      return { ...state, currentQuestion: action.payload };

    case "UPDATE_INPUT":
      return { ...state, userInput: action.payload };

    case "MARK_CORRECT": {
      const newAnsweredQuestions = new Set(state.answeredQuestions);
      newAnsweredQuestions.add(action.payload);

      const newIncorrectQuestions = new Set(state.incorrectQuestions);
      newIncorrectQuestions.delete(action.payload);

      return {
        ...state,
        answeredQuestions: newAnsweredQuestions,
        incorrectQuestions: newIncorrectQuestions,
      };
    }

    case "MARK_INCORRECT": {
      const newAnsweredQuestions = new Set(state.answeredQuestions);
      newAnsweredQuestions.add(action.payload);

      const newIncorrectQuestions = new Set(state.incorrectQuestions);
      newIncorrectQuestions.add(action.payload);

      return {
        ...state,
        answeredQuestions: newAnsweredQuestions,
        incorrectQuestions: newIncorrectQuestions,
      };
    }

    case "SHOW_ANSWER":
      return { ...state, showAnswer: true };

    case "NEXT_QUESTION":
      return {
        ...state,
        currentQuestion: action.payload,
        userInput: "",
        showAnswer: false,
      };

    case "RESET_FOR_NEXT":
      return {
        ...state,
        userInput: "",
        showAnswer: false,
      };

    default:
      return state;
  }
}
