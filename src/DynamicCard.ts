import type { AppCard } from "./AppCard";
import type { DatabaseHelper } from "./database-helper";
import type { Difficulty } from "./quizStateReducer";

export interface DynamicCardCreateOptions {
  difficulty: Difficulty;
  dbHelper: DatabaseHelper;
}

/**
 * Represents a card whose content is dynamically (randomly)
 * generated at runtime.
 */
export interface DynamicCard {
  /**
   * Dynamic cards are identified by a unique category name.
   *
   * Conventionally it should start with the word "Special:", e.g.
   * "Special: Restaurant Ordering".
   */
  category: string;

  /**
   * Create a random dynamic card and return it.
   */
  create(options: DynamicCardCreateOptions): AppCard;
}

export class DynamicCardManager {
  private readonly cards: DynamicCard[];
  private readonly cardCategoryMap: Map<string, DynamicCard>;

  constructor(cards: DynamicCard[] = []) {
    this.cards = cards;
    this.cardCategoryMap = new Map(cards.map((card) => [card.category, card]));
  }

  /**
   * Creates one random instance of each dynamic card type and
   * returns them all.
   */
  createAll(options: DynamicCardCreateOptions): AppCard[] {
    return this.cards.map((card) => card.create(options));
  }

  /**
   * Re-generate the dynamic cards so they have new random values.
   *
   * Non-dynamic cards will be unaffected.
   */
  regenerate(cards: AppCard[], options: DynamicCardCreateOptions): AppCard[] {
    return cards.map((card) => {
      if (card.category) {
        const dynamicCard = this.cardCategoryMap.get(card.category ?? "");
        if (dynamicCard) {
          return dynamicCard.create(options);
        }
      }
      return card;
    });
  }
}
