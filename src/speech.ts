/**
 * Returns whether the browser supports the Web Speech API *and*
 * has a Korean voice available.
 */
export function supportsKoreanSpeech(): boolean {
  // TODO implement this!
  return true;
}

/**
 * Use the Web Speech API to vocalize the given Hangul using the first
 * Korean-language voice available.
 */
export function vocalizeKoreanSpeech(hangul: string) {
  console.log(`TODO: Say ${hangul}!`);
}
