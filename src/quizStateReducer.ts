import type { DatabaseRow } from "./database-spec";

export type Mode =
  | "translate"
  | "typingtutor"
  | "picture"
  | "minimalpair"
  | "reversepicture";

const MODES: Record<Mode, true> = {
  translate: true,
  typingtutor: true,
  picture: true,
  minimalpair: true,
  reversepicture: true,
};

export function validateMode(mode: string): Mode | undefined {
  if (mode in MODES) {
    return mode as Mode;
  }
}

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

const DEFAULT_OPTIONS: QuizOptions = {
  mode: "translate",
  category: undefined,
  maxQuestions: undefined,
};

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
  options: Partial<QuizOptions> = {},
  initialQuestionId: string | undefined = undefined,
): QuizState => {
  const { mode, category, maxQuestions } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };
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

  const getInitialQuestion = () => {
    if (initialQuestionId) {
      const index = remainingQuestions.findIndex(
        (q) => q.id === initialQuestionId,
      );
      if (index !== -1) {
        return remainingQuestions.splice(index, 1)[0];
      }
    }
    return remainingQuestions.pop() ?? DUMMY_QUESTION;
  };

  return {
    currentQuestion: getInitialQuestion(),
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
        return createInitialState(state.allQuestions, {
          ...state,
        });
      }
    }

    case "SET_OPTIONS": {
      return createInitialState(
        state.allQuestions,
        {
          ...state,
          ...action,
        },
        state.currentQuestion.id,
      );
    }

    default:
      return state;
  }
}
