/**
 * Ideally we'd just lean on the browser to choose whatever
 * Korean voice the user has indicated a preference for at
 * the browser or OS level, but it doesn't seem like this
 * is supported well across differennt browsers, e.g.:
 *
 *   * Firefox will default to the system's default for
 *     an utterance's language if it doesn't have a voice
 *     explicitly set.  `getVoices()` does not have `default`
 *     set for whatever the system default for a given
 *     language is, though.
 *
 *   * Safari will not vocalize an utterance at all if
 *     it doesn't have a voice explicitly set. `getVoices()`
 *     seems to claim that *all* voices are default.
 *
 * So we're just going to fall back on choosing some good voices
 * based on regular expressions.
 */
const BEST_VOICES = [
  // "Yuna" is a voice that sounds pretty good on Apple devices,
  // and comes in premium and enhanced variants.
  /^yuna.*premium/i,
  /^yuna.*enhanced/i,
  // Fall back to *any* Korean premium or enhanced voice.
  /premium/i,
  /enhanced/i,
  // Fall back to Yuna if nothing else is available, it's still
  // much better than most of the other pre-installed Korean voices.
  /^yuna/i,
];

/**
 * Returns the best available Korean voice, or null if none found.
 */
const getBestKoreanVoice = (() => {
  // This lazily figures out what the best Korean voice is and
  // caches it for fast subsequent retrieval.

  let bestKoreanVoice: SpeechSynthesisVoice | null | undefined;

  function findBestKoreanVoice(): SpeechSynthesisVoice | null {
    if (!("speechSynthesis" in window)) {
      return null;
    }

    const koreanVoices = speechSynthesis
      .getVoices()
      .filter((voice) => voice.lang.startsWith("ko"));
    for (const regex of BEST_VOICES) {
      for (const voice of koreanVoices) {
        if (regex.test(voice.name)) {
          return voice;
        }
      }
    }
    return koreanVoices[0] ?? null;
  }

  return () => {
    if (bestKoreanVoice === undefined) {
      bestKoreanVoice = findBestKoreanVoice();
    }
    return bestKoreanVoice;
  };
})();

/**
 * Returns whether the browser supports the Web Speech API *and*
 * has a Korean voice available.
 */
export function supportsKoreanSpeech(): boolean {
  return getBestKoreanVoice() !== null;
}

/**
 * Use the Web Speech API to vocalize the given Hangul using the best
 * Korean-language voice available.
 */
export function vocalizeKoreanSpeech(hangul: string) {
  const koreanVoice = getBestKoreanVoice();
  if (!koreanVoice) {
    console.warn("Korean speech synthesis not supported");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(hangul);
  utterance.voice = koreanVoice;
  utterance.lang = "ko-KR";
  utterance.rate = 0.5;
  speechSynthesis.speak(utterance);
}
