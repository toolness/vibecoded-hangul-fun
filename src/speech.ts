/**
 * Returns the first available Korean voice, or null if none found.
 */
function findKoreanVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) {
    return null;
  }

  const voices = speechSynthesis.getVoices();
  return voices.find(voice => voice.lang.startsWith('ko')) || null;
}

/**
 * Returns whether the browser supports the Web Speech API *and*
 * has a Korean voice available.
 */
export function supportsKoreanSpeech(): boolean {
  return findKoreanVoice() !== null;
}

/**
 * Use the Web Speech API to vocalize the given Hangul using the first
 * Korean-language voice available.
 */
export function vocalizeKoreanSpeech(hangul: string) {
  const koreanVoice = findKoreanVoice();
  if (!koreanVoice) {
    console.warn('Korean speech synthesis not supported');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(hangul);
  utterance.voice = koreanVoice;
  utterance.lang = 'ko-KR';
  speechSynthesis.speak(utterance);
}
