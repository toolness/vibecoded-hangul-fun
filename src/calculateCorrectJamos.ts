import {
  decompose_all_hangul_syllables,
  hangul_jamo_to_compat_with_fallback,
} from "./hangul";

const decomposeToCompatJamos = (value: string) =>
  decompose_all_hangul_syllables(value)
    .split("")
    .map((c) => hangul_jamo_to_compat_with_fallback(c));

export const calculateCorrectJamos = (
  correctHangul: string,
  userInput: string,
): { correct: number; total: number } => {
  const decomposedCorrectAnswer = decomposeToCompatJamos(correctHangul);
  const decomposedUserInput = decomposeToCompatJamos(userInput);
  let correctCount = 0;

  for (
    let i = 0;
    i < decomposedUserInput.length && i < decomposedCorrectAnswer.length;
    i++
  ) {
    if (decomposedUserInput[i] === decomposedCorrectAnswer[i]) {
      correctCount++;
    } else {
      break; // Stop counting after first incorrect jamo
    }
  }

  return { correct: correctCount, total: decomposedCorrectAnswer.length };
};
