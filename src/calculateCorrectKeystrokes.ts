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
