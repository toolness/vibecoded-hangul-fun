/**
 * Returns whether the browser supports the Web Speech API *and*
 * has a Korean voice available.
 */
export function supportsKoreanSpeech(): boolean {
  if (!("speechSynthesis" in window)) {
    return false;
  }

  return speechSynthesis
    .getVoices()
    .some((voice) => voice.lang.startsWith("ko"));
}

/**
 * Use the Web Speech API to vocalize the given Hangul using the best
 * Korean-language voice available.
 */
export function vocalizeKoreanSpeech(hangul: string) {
  // Note that we're not actually setting the voice. On MacOS, at least,
  // this means that the browser will choose the user's default Korean
  // voice, which can be set via System Settings.
  const utterance = new SpeechSynthesisUtterance(hangul);
  utterance.lang = "ko-KR";
  utterance.rate = 0.5;
  speechSynthesis.speak(utterance);
}
