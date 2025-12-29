import type { FillInTheBlankItem } from "../AppCard";
import type { WordDatabaseRow, WordPicture } from "../database-spec";
import type {
  DynamicCard,
  DynamicCardCreateOptions,
  DynamicCardFactory,
} from "../DynamicCard";
import { EMPTY_QUESTION } from "../quizStateReducer";
import {
  convertWordsToCharacters,
  convertWordsToUnderscores,
  shuffleInPlace,
} from "../util";

export type AiGeneratedFillInTheBlankSentence = {
  /**
   * The sentence, in Korean.
   */
  sentence: string;

  /**
   * A slug for the sentence. This will be used for saving
   * audio of the sentence to a file, etc.  It should be
   * pure ASCII, and as such it should contain a rough
   * English translation of the sentence
   */
  slug: string;

  /**
   * Mappings from words in the sentence (including any
   * attached particles) to their canonical forms in our
   * vocabulary.
   *
   * For example, if `sentence` is:
   *
   *   연못도 그에게 웃어주었습니다.
   *
   * Then, assuming our vocabulary has the words
   * `연못`, `웃다`, and `주다` in it, our `vocabularyMappings`
   * should be:
   *
   * ```
   * {
   *   `연못도`: [`연못`],
   *   `웃어주었습니다`: [`웃다`, `주다`]
   * }
   * ```
   */
  vocabularyMappings: Record<string, string[]>;
};

function getSentenceAudioUrl(
  sentence: AiGeneratedFillInTheBlankSentence,
): string | undefined {
  const { VITE_AWS_BUCKET, VITE_AWS_BUCKET_REGION } = import.meta.env;
  if (VITE_AWS_BUCKET && VITE_AWS_BUCKET_REGION) {
    return `https://${VITE_AWS_BUCKET}.s3.${VITE_AWS_BUCKET_REGION}.amazonaws.com/ai-generated-sentences/${sentence.slug}.mp3`;
  }
}

function getSentenceCard(
  { sentence, mainWordHangul }: SentenceWithMainWord,
  { dbHelper, difficulty }: DynamicCardCreateOptions,
): DynamicCard {
  let mainPicture: WordPicture | undefined;
  const extraWords: WordDatabaseRow[] = [];

  const fillInTheBlankItems: FillInTheBlankItem[] = [];
  const sentenceParts = sentence.sentence.split(mainWordHangul);
  if (sentenceParts.length !== 2) {
    // For now only support situations where the word appears once in the sentence, i.e.
    // the sentence is split into two by the word.
    // [tag:word-occurs-once-per-sentence]
    throw new Error(
      `Assertion failure, word "${mainWordHangul}" can only appear once in sentence "${sentence.sentence}"`,
    );
  }
  const addFillInTheBlankContent = (content: string) => {
    if (content !== "") {
      if (difficulty === "hard") {
        // Mask non-fill-in-the-blank words, forcing user to use their ears.
        content = convertWordsToCharacters(content, "?");
      }
      fillInTheBlankItems.push({ type: "content", value: content });
    }
  };
  addFillInTheBlankContent(sentenceParts[0]);
  fillInTheBlankItems.push({
    type: "fill-in",
    blankValue: convertWordsToUnderscores(mainWordHangul),
    answer: mainWordHangul,
  });
  addFillInTheBlankContent(sentenceParts[1]);

  for (const [wordHangul, words] of Object.entries(
    sentence.vocabularyMappings,
  )) {
    for (const word of words) {
      if (difficulty === "hard") {
        // Don't show any pictures on hard mode.
        continue;
      }
      if (wordHangul === mainWordHangul && difficulty !== "easy") {
        // Only show a picture of the main word on easy mode, otherwise
        // the user should listen for it + infer meaning from other words.
        continue;
      }
      const entry = dbHelper.wordHangulMap.get(word);
      if (entry && entry.picture) {
        if (wordHangul === mainWordHangul && !mainPicture) {
          mainPicture = entry.picture;
        } else {
          extraWords.push(entry);
        }
      }
    }
  }

  return {
    name: mainWordHangul,
    isTranslation: true,
    hangul: mainWordHangul,
    fullHangul: sentence.sentence,
    fillInTheBlankItems,
    autoPlayAudio: true,
    audioUrl: getSentenceAudioUrl(sentence),
    notes: sentence.sentence,
    picture: mainPicture ?? {
      type: "emojis",
      emojis: "👂",
    },
    extraWords,
  };
}

type SentenceWithMainWord = {
  sentence: AiGeneratedFillInTheBlankSentence;
  mainWordHangul: string;
};

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
export async function createAiGeneratedFillInTheBlankDynamicCardFactory(): Promise<DynamicCardFactory> {
  // Note that Vite will parse this, it shouldn't get
  // too complicated!  For more details see:
  // https://vite.dev/guide/assets
  const sentences: AiGeneratedFillInTheBlankSentence[] = await (
    await fetch(
      new URL(`../assets/ai-generated-sentences.json`, import.meta.url),
    )
  ).json();

  const createRemaining = (): SentenceWithMainWord[] => {
    const remaining: SentenceWithMainWord[] = [];
    for (const sentence of sentences) {
      for (const mainWordHangul of Object.keys(sentence.vocabularyMappings)) {
        const sentenceParts = sentence.sentence.split(mainWordHangul);
        if (sentenceParts.length !== 2) {
          // [ref:word-occurs-once-per-sentence]
          continue;
        }
        remaining.push({ sentence, mainWordHangul });
      }
    }
    shuffleInPlace(remaining);
    return remaining;
  };

  let remaining = createRemaining();

  return {
    category: "Special: AI-generated sentences",
    create(args) {
      if (remaining.length === 0) {
        remaining = createRemaining();
      }
      const sentenceWithMainWord = remaining.pop();
      if (!sentenceWithMainWord) {
        return EMPTY_QUESTION;
      }
      return getSentenceCard(sentenceWithMainWord, args);
    },
  };
}
