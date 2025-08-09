import { useEffect, useMemo, useState } from "react";

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

export type Vocalizer = (hangul: string) => void;

/**
 * A React hook that returns a function to vocalize the given
 * Hangul, using the Web Speech API with the best
 * Korean-language voice available.
 */
export function useKoreanVocalizer(): Vocalizer | null {
  const [bestKoreanVoice, setBestKoreanVoice] = useState(findBestKoreanVoice);

  useEffect(() => {
    if ("speechSynthesis" in window) {
      const handleVoicesChanged = () => {
        setBestKoreanVoice(findBestKoreanVoice());
      };
      // On Firefox, there are no voices loaded before the 'load'
      // event is fired, it seems.
      window.addEventListener("load", handleVoicesChanged);
      // Browsers should technically fire this event whenever
      // the voice list changes, though I haven't observed this
      // happen in practice yet.
      window.speechSynthesis.addEventListener(
        "voiceschanged",
        handleVoicesChanged,
      );
      return () => {
        window.removeEventListener("load", handleVoicesChanged);
        window.speechSynthesis.removeEventListener(
          "voiceschanged",
          handleVoicesChanged,
        );
      };
    }
  });

  const vocalizer: Vocalizer | null = useMemo(() => {
    if (!bestKoreanVoice) {
      return null;
    }
    return (hangul: string) => {
      const utterance = new SpeechSynthesisUtterance(hangul);
      utterance.voice = bestKoreanVoice;
      utterance.lang = "ko-KR";
      utterance.rate = 0.5;
      speechSynthesis.speak(utterance);
    };
  }, [bestKoreanVoice]);

  return vocalizer;
}
