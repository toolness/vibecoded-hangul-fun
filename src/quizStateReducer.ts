import type { DatabaseRow } from "./database-spec";

export type Mode =
  | "translate"
  | "typingtutor"
  | "picture"
  | "minimalpair"
  | "reversepicture";

export interface QuizOptions {
  category: string | undefined;
  maxQuestions: number | undefined;
  mode: Mode;
}

export interface QuizState extends QuizOptions {
  currentQuestion: DatabaseRow;
  userInput: string;
  remainingQuestions: DatabaseRow[];
  allQuestions: DatabaseRow[];
  allQuestionsFiltered: DatabaseRow[];
  showAnswer: boolean;
}

const DUMMY_QUESTION: DatabaseRow = {
  id: "dummy-question-id",
  createdTime: new Date().toISOString(),
  name: "???",
  hangul: "???",
  picture: {
    type: "emojis",
    emojis: "❓",
  },
};

function filterQuestionsForMode(
  allQuestions: DatabaseRow[],
  mode: Mode,
): DatabaseRow[] {
  switch (mode) {
    case "translate":
      return allQuestions.filter(
        (question) =>
          question.name &&
          question.hangul &&
          // Only include romanized names.
          !question.isTranslation,
      );
    case "typingtutor":
      return allQuestions.filter((question) => question.hangul);
    case "picture":
      return allQuestions.filter(
        (question) => question.hangul && question.picture,
      );
    case "reversepicture":
      return allQuestions.filter(
        (question) => question.hangul && question.picture,
      );
    case "minimalpair":
      return allQuestions.filter(
        (question) =>
          question.hangul &&
          question.name &&
          question.minimalPairs &&
          question.audio,
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
  maxQuestions: number | undefined = undefined,
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
  const remainingQuestions = allQuestionsFiltered.slice(0, maxQuestions);
  shuffleInPlace(remainingQuestions);
  return {
    currentQuestion: remainingQuestions.pop() ?? DUMMY_QUESTION,
    userInput: "",
    remainingQuestions,
    allQuestions,
    allQuestionsFiltered,
    category,
    maxQuestions,
    showAnswer: false,
    mode,
  };
};

export type QuizAction =
  | { type: "UPDATE_INPUT"; input: string }
  | { type: "SHOW_ANSWER" }
  | { type: "NEXT_QUESTION" }
  | { type: "SET_QUESTION"; question: DatabaseRow }
  | ({
      type: "SET_OPTIONS";
      // Note that there's a semantic difference here between not specifying
      // an option at all, and setting it to undefined. The former will not
      // modify the option, while the latter will set it to undefined.
    } & Partial<QuizOptions>);

export function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "UPDATE_INPUT":
      return { ...state, userInput: action.input };

    case "SHOW_ANSWER":
      return { ...state, showAnswer: true };

    case "SET_QUESTION":
      return {
        ...state,
        currentQuestion: action.question,
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

    case "SET_OPTIONS": {
      const options: QuizOptions = {
        ...state,
        ...action,
      };
      return createInitialState(
        state.allQuestions,
        options.mode,
        options.category,
        options.maxQuestions,
      );
    }

    default:
      return state;
  }
}
