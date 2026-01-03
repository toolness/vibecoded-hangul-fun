import type { FillInTheBlankItem } from "../AppCard";
import type { WordDatabaseRow, WordPicture } from "../database-spec";
import type {
  DynamicCard,
  DynamicCardCreateOptions,
  DynamicCardFactory,
} from "../DynamicCard";
import {
  getAiGeneratedSentenceAudioUrl,
  loadAiGeneratedSentences,
} from "../mediaCache";
import { EMPTY_QUESTION } from "../quizStateReducer";
import { convertWordsToUnderscores, shuffleInPlace } from "../util";
import type { AiGeneratedFillInTheBlankSentence } from "./aiGeneratedFillInTheBlank";

function getSentenceCard(
  sentence: AiGeneratedFillInTheBlankSentence,
  { dbHelper, difficulty }: DynamicCardCreateOptions,
): DynamicCard {
  let mainPicture: WordPicture | undefined;
  const extraWords: WordDatabaseRow[] = [];

  const fillInTheBlankItems: FillInTheBlankItem[] = [
    {
      type: "fill-in",
      blankValue: convertWordsToUnderscores(sentence.sentence),
      answer: sentence.sentence,
    },
  ];

  for (const words of Object.values(sentence.vocabularyMappings)) {
    for (const word of words) {
      if (difficulty != "easy") {
        continue;
      }
      const entry = dbHelper.wordHangulMap.get(word);
      if (entry && entry.picture) {
        if (!mainPicture) {
          mainPicture = entry.picture;
        } else {
          extraWords.push(entry);
        }
      }
    }
  }

  return {
    name: sentence.sentence,
    isTranslation: true,
    hangul: sentence.sentence,
    fillInTheBlankItems,
    autoPlayAudio: true,
    audioUrl: getAiGeneratedSentenceAudioUrl(sentence),
    notes: sentence.sentence,
    picture: mainPicture ?? {
      type: "emojis",
      emojis: "👂",
    },
    extraWords,
  };
}

/**
 * This "factory factory" (ugh) is a hack to get around the
 * fact that our dynamic card factory system currently only supports
 * one card per deck. Ordinarily this isn't a problem because the
 * dynamic cards are expected to have infinite variety, but that's not
 * actually the case for these AI-generated cards, where we have a
 * a fairly limited set of cards and we don't want to repeat things.
 *
 * So, the outer factory keeps track of what cards are left to render,
 * while the inner one actually creates the next card.
 *
 * In some sense the outer factory is like a "deck" and the inner one
 * pulls the next card from it (and reshuffles it if there are none left).
 * The downside here is that there's not really a way for the
 * user to force a reshuffle of the whole deck, aside from reloading
 * the web page.
 */
export async function createAiGeneratedFullSentenceDynamicCardFactory(): Promise<DynamicCardFactory> {
  const sentences = await loadAiGeneratedSentences();

  const createRemaining = (): AiGeneratedFillInTheBlankSentence[] => {
    const remaining: AiGeneratedFillInTheBlankSentence[] = [];
    for (const sentence of sentences) {
      remaining.push(sentence);
    }
    shuffleInPlace(remaining);
    return remaining;
  };

  let remaining = createRemaining();

  return {
    category: "Special: AI-generated sentences (full)",
    create(args) {
      if (remaining.length === 0) {
        remaining = createRemaining();
      }
      const sentence = remaining.pop();
      if (!sentence) {
        return EMPTY_QUESTION;
      }
      return getSentenceCard(sentence, args);
    },
  };
}
