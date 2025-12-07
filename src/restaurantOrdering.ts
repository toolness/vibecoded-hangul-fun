import type { DynamicCardFactory } from "./DynamicCard";
import { EMPTY_QUESTION } from "./quizStateReducer";
import {
  convertWordsToUnderscores,
  getRandomItem,
  isDefined,
  verifyExists,
} from "./util";

type KoreanNumber = {
  number: number;
  long: string;
  short?: string;
};

const KOREAN_NUMBERS: KoreanNumber[] = [
  { number: 1, long: "하나", short: "한" },
  { number: 2, long: "둘", short: "두" },
  { number: 3, long: "셋", short: "세" },
  { number: 4, long: "넷", short: "네" },
  { number: 5, long: "다섯" },
  { number: 6, long: "여섯" },
  { number: 7, long: "일곱" },
  { number: 8, long: "여덟" },
  { number: 9, long: "아홉" },
  { number: 10, long: "열" },
];

type FoodItem = {
  /** Name of food in Hangul. */
  name: string;
  /** Unit of food used when ordering at restaurant. */
  unit: FoodUnit;
};

type FoodUnit = {
  hangul: string;
  english: string | undefined;
};

const bottle: FoodUnit = {
  hangul: "병",
  english: "bottle",
};

const cup: FoodUnit = {
  hangul: "잔",
  english: "cup",
};

const thingy: FoodUnit = {
  hangul: "개",
  english: undefined,
};

/**
 * List of food/drink items with their units used when ordering
 * them in a Korean restaurant.
 */
const FOODS: FoodItem[] = [
  { name: "콜라", unit: bottle },
  { name: "맥주", unit: bottle },
  { name: "우유", unit: cup },
  { name: "커피", unit: cup },
  { name: "물", unit: cup },
  { name: "빵", unit: thingy },
  { name: "냉면", unit: thingy },
  { name: "잡채", unit: thingy },
  { name: "김밥", unit: thingy },
  { name: "불고기", unit: thingy },
  { name: "김치", unit: thingy },
  { name: "비빔밥", unit: thingy },
  { name: "오렌지", unit: thingy },
  { name: "떡볶이", unit: thingy },
  { name: "라면", unit: thingy },
  { name: "주스", unit: cup },
  { name: "사과", unit: thingy },
];

export const RestaurantOrderingDynamicCard: DynamicCardFactory = {
  category: "Special: Restaurant Ordering",
  create({ dbHelper }) {
    const getWord = (hangul: string) => dbHelper.wordHangulMap.get(hangul);
    const foodsWithPictures = FOODS.filter((food) =>
      Boolean(getWord(food.name)?.picture),
    );
    if (foodsWithPictures.length === 0) {
      return EMPTY_QUESTION;
    }
    const food = getRandomItem(foodsWithPictures);
    const foodWord = verifyExists(getWord(food.name));
    const foodPicture = verifyExists(foodWord.picture);
    const amount = getRandomItem(KOREAN_NUMBERS);
    const amountHangul: string = amount.short ?? amount.long;
    const answer = `${food.name} ${amountHangul} ${food.unit.hangul}`;
    const englishUnits: string = food.unit.english
      ? amount.number === 1
        ? `${food.unit.english} of `
        : `${food.unit.english}s of `
      : ``;
    const translation = `Please give me ${amount.number} ${englishUnits}${foodWord.name.toLocaleLowerCase()}.`;
    const notes = `"${translation}"`;

    return {
      notionId: foodWord.id,
      name: translation,
      isTranslation: true,
      hangul: answer,
      fullHangul: `${answer} 주세요`,
      fillInTheBlankItems: [
        {
          type: "fill-in",
          blankValue: `${convertWordsToUnderscores(food.name)} ${amount.number} ${convertWordsToUnderscores(food.unit.hangul)}`,
          answer,
        },
        { type: "content", value: " 주세요" },
      ],
      picture: foodPicture,
      notes,
      extraWords: [food.unit.hangul, amount.long]
        .map(getWord)
        .filter(isDefined),
    };
  },
};
