import type { DatabaseRow } from "./database-spec";

export interface QuizState {
  currentQuestion: DatabaseRow;
  userInput: string;
  answeredQuestions: Set<DatabaseRow>;
  incorrectQuestions: Set<DatabaseRow>;
  showAnswer: boolean;
}

export const createInitialState = (
  currentQuestion: DatabaseRow,
): QuizState => ({
  currentQuestion,
  userInput: "",
  answeredQuestions: new Set(),
  incorrectQuestions: new Set(),
  showAnswer: false,
});

export type QuizAction =
  | { type: "UPDATE_INPUT"; payload: string }
  | { type: "MARK_CORRECT"; payload: DatabaseRow }
  | { type: "MARK_INCORRECT"; payload: DatabaseRow }
  | { type: "SHOW_ANSWER" }
  | { type: "NEXT_QUESTION"; payload: DatabaseRow };

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
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

    default:
      return state;
  }
}
