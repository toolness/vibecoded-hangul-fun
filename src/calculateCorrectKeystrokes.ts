import {
  decompose_all_hangul_syllables,
  hangul_jamo_to_compat_with_fallback,
  split_hangul_compat_into_keystrokes,
} from "./hangul";

const decomposeToHangulKeystrokes = (value: string) =>
  decompose_all_hangul_syllables(value)
    .split("")
    .map((c) => hangul_jamo_to_compat_with_fallback(c))
    .flatMap((c) => split_hangul_compat_into_keystrokes(c));

type BestAnswer = {
  answer: string;
  correct: number;
  total: number;
  isCompletelyCorrect: boolean;
};

/**
 * Out of all possible answer and the given user inputs, figures out
 * which answer the input is closest to, and returns details about it.
 */
export function calculateBestAnswer(args: {
  possibleAnswers: string[];
  userInput: string;
}): BestAnswer {
  const { possibleAnswers, userInput } = args;
  let bestAnswer: BestAnswer = {
    answer: "",
    correct: 0,
    total: Infinity,
    isCompletelyCorrect: false,
  };

  for (const answer of possibleAnswers) {
    const { correct, total } = calculateCorrectKeystrokes(answer, userInput);
    if (answer === userInput) {
      return {
        answer,
        correct,
        total,
        isCompletelyCorrect: true,
      };
    }

    if (
      correct > bestAnswer.correct ||
      (correct === bestAnswer.correct && total <= bestAnswer.total)
    ) {
      bestAnswer = {
        answer,
        total,
        correct,
        isCompletelyCorrect: false,
      };
    }
  }

  return bestAnswer;
}

export const calculateCorrectKeystrokes = (
  correctHangul: string,
  userInput: string,
): { correct: number; total: number } => {
  const decomposedCorrectAnswer = decomposeToHangulKeystrokes(correctHangul);
  const decomposedUserInput = decomposeToHangulKeystrokes(userInput);
  let correctCount = 0;

  for (
    let i = 0;
    i < decomposedUserInput.length && i < decomposedCorrectAnswer.length;
    i++
  ) {
    if (decomposedUserInput[i] === decomposedCorrectAnswer[i]) {
      correctCount++;
    } else {
      break; // Stop counting after first incorrect keystroke
    }
  }

  return { correct: correctCount, total: decomposedCorrectAnswer.length };
};
