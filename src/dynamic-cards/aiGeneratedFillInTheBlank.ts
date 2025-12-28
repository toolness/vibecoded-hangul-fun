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
  getRandomItem,
} from "../util";

export type AiGeneratedFillInTheBlankSentence = {
  /**
   * The sentence, in Korean.
   */
  sentence: string;

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

// Note that Vite will parse this, it shouldn't get
// too complicated!  For more details see:
// https://vite.dev/guide/assets
const sentences: AiGeneratedFillInTheBlankSentence[] = await (
  await fetch(new URL(`../assets/ai-generated-sentences.json`, import.meta.url))
).json();

function getSentenceCard(
  sentence: AiGeneratedFillInTheBlankSentence,
  mainWordHangul: string,
  { dbHelper, difficulty }: DynamicCardCreateOptions,
): DynamicCard | undefined {
  let mainPicture: WordPicture | undefined;
  const extraWords: WordDatabaseRow[] = [];

  const fillInTheBlankItems: FillInTheBlankItem[] = [];
  const sentenceParts = sentence.sentence.split(mainWordHangul);
  if (sentenceParts.length !== 2) {
    // For now only support situations where the word appears once in the sentence, i.e.
    // the sentence is split into two by the word.
    return;
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
    notes: sentence.sentence,
    picture: mainPicture ?? {
      type: "emojis",
      emojis: "👂",
    },
    extraWords,
  };
}

function getRandomSentenceCard(
  args: DynamicCardCreateOptions,
): DynamicCard | undefined {
  if (sentences.length === 0) {
    return;
  }

  const MAX_ATTEMPTS = 10;

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const sentence = getRandomItem(sentences);
    const wordsHangul = Object.keys(sentence.vocabularyMappings);
    if (wordsHangul.length === 0) {
      return;
    }
    const mainWordHangul = getRandomItem(wordsHangul);
    const card = getSentenceCard(sentence, mainWordHangul, args);
    if (card) {
      return card;
    }
  }
}

export const AiGeneratedFillInTheBlankDynamicCard: DynamicCardFactory = {
  category: "Special: AI-generated sentences",
  create(args) {
    return getRandomSentenceCard(args) ?? EMPTY_QUESTION;
  },
};
