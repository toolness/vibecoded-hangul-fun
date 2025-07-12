/**
 * Returns whether the browser supports the Web Speech API *and*
 * has a Korean voice available.
 */
export function supportsKoreanSpeech(): boolean {
  if (!('speechSynthesis' in window)) {
    return false;
  }

  const voices = speechSynthesis.getVoices();
  return voices.some(voice => voice.lang.startsWith('ko'));
}

/**
 * Use the Web Speech API to vocalize the given Hangul using the first
 * Korean-language voice available.
 */
export function vocalizeKoreanSpeech(hangul: string) {
  if (!supportsKoreanSpeech()) {
    console.warn('Korean speech synthesis not supported');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(hangul);
  const voices = speechSynthesis.getVoices();
  const koreanVoice = voices.find(voice => voice.lang.startsWith('ko'));
  
  if (koreanVoice) {
    utterance.voice = koreanVoice;
  }
  
  utterance.lang = 'ko-KR';
  speechSynthesis.speak(utterance);
}
