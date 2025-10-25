import type { AppCard } from "./AppCard";
import type { DatabaseHelper } from "./database-helper";
import {
  EMPTY_QUESTION,
  SPECIAL_RESTAURANT_ORDERING_CATEGORY,
  SPECIAL_RESTAURANT_ORDERING_ID,
} from "./quizStateReducer";
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
  unit: string;
};

/**
 * List of food/drink items with their units used when ordering
 * them in a Korean restaurant.
 */
const FOODS: FoodItem[] = [
  { name: "콜라", unit: "병" },
  { name: "맥주", unit: "병" },
  { name: "우유", unit: "잔" },
  { name: "커피", unit: "잔" },
  { name: "물", unit: "잔" },
  { name: "빵", unit: "개" },
  { name: "냉면", unit: "개" },
  { name: "잡채", unit: "개" },
  { name: "김밥", unit: "개" },
  { name: "불고기", unit: "개" },
  { name: "김치", unit: "개" },
  { name: "비빔밥", unit: "개" },
  { name: "오렌지", unit: "개" },
  { name: "떡볶이", unit: "개" },
  { name: "라면", unit: "개" },
  { name: "주스", unit: "잔" },
  { name: "사과", unit: "개" },
];

/**
 * Randomly generates a restaurant ordering card.
 *
 * This should be the only card of its type in the deck.
 */
export function makeRestaurantOrderingCard(dbHelper: DatabaseHelper): AppCard {
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
  const answer = `${food.name} ${amountHangul} ${food.unit}`;
  const englishFoodName: string = getWord(food.name)?.name ?? food.name;
  const translation = `Please give me ${amount.number} ${englishFoodName}.`;
  const notes = `"${translation}"`;

  return {
    id: SPECIAL_RESTAURANT_ORDERING_ID,
    category: SPECIAL_RESTAURANT_ORDERING_CATEGORY,
    notionId: foodWord.id,

    // We don't want this to constantly show up at the top of the deck
    // when it's ordered reverse chronologically, so just hard-code a
    // time in the past for now.
    createdTime: "2025-09-17T05:26:00.000Z",
    lastModifiedTime: "2025-09-17T05:26:00.000Z",

    name: translation,
    isTranslation: true,
    hangul: answer,
    fillInTheBlankItems: [
      {
        type: "fill-in",
        blankValue: `${convertWordsToUnderscores(food.name)} ${amount.number} ${convertWordsToUnderscores(food.unit)}`,
        answer,
      },
      { type: "content", value: " 주세요" },
    ],
    picture: foodPicture,
    notes,
    extraWords: [food.unit, amount.long].map(getWord).filter(isDefined),
  };
}
