import type { DatabaseRow } from "./database-spec";

export type Mode = "translate" | "typingtutor" | "picture";

export interface QuizState {
  currentQuestion: DatabaseRow;
  userInput: string;
  remainingQuestions: DatabaseRow[];
  allQuestions: DatabaseRow[];
  allQuestionsFiltered: DatabaseRow[];
  category: string | undefined;
  showAnswer: boolean;
  mode: Mode;
}

const DUMMY_QUESTION: DatabaseRow = {
  name: "???",
  hangul: "???",
  url: "",
  imageUrl:
    "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==",
};

function filterQuestionsForMode(
  allQuestions: DatabaseRow[],
  mode: Mode,
): DatabaseRow[] {
  switch (mode) {
    case "translate":
      return allQuestions.filter(
        (question) => question.name && question.hangul,
      );
    case "typingtutor":
      return allQuestions.filter((question) => question.hangul);
    case "picture":
      return allQuestions.filter(
        (question) => question.hangul && question.imageUrl,
      );
  }
}

function shuffleInPlace<T>(array: T[]) {
  // Fisher-Yates shuffle (via GitHub Copilot)
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

export const createInitialState = (
  allQuestions: DatabaseRow[],
  mode: Mode = "translate",
  category: string | undefined = undefined,
): QuizState => {
  const allQuestionsFiltered = filterQuestionsForMode(
    allQuestions,
    mode,
  ).filter((question) => {
    if (!category) {
      return true;
    }
    return question.category === category;
  });
  const remainingQuestions = allQuestionsFiltered.slice();
  shuffleInPlace(remainingQuestions);
  return {
    currentQuestion: remainingQuestions.pop() ?? DUMMY_QUESTION,
    userInput: "",
    remainingQuestions,
    allQuestions,
    allQuestionsFiltered,
    category,
    showAnswer: false,
    mode,
  };
};

export type QuizAction =
  | { type: "UPDATE_INPUT"; payload: string }
  | { type: "SHOW_ANSWER" }
  | { type: "NEXT_QUESTION" }
  | { type: "SET_QUESTION"; payload: DatabaseRow }
  | { type: "SET_MODE"; payload: Mode }
  | { type: "SET_CATEGORY"; category: string | undefined };

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "UPDATE_INPUT":
      return { ...state, userInput: action.payload };

    case "SHOW_ANSWER":
      return { ...state, showAnswer: true };

    case "SET_QUESTION":
      return {
        ...state,
        currentQuestion: action.payload,
        userInput: "",
        showAnswer: false,
      };

    case "NEXT_QUESTION": {
      const currentQuestion = state.remainingQuestions.pop();
      if (currentQuestion) {
        return {
          ...state,
          currentQuestion,
          userInput: "",
          showAnswer: false,
        };
      } else {
        return createInitialState(
          state.allQuestions,
          state.mode,
          state.category,
        );
      }
    }

    case "SET_MODE":
      return createInitialState(
        state.allQuestions,
        action.payload,
        state.category,
      );

    case "SET_CATEGORY":
      return createInitialState(
        state.allQuestions,
        state.mode,
        action.category,
      );

    default:
      return state;
  }
}
