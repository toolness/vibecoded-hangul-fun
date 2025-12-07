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
export type DynamicCard = Omit<
  AppCard,
  "id" | "notionId" | "category" | "createdTime" | "lastModifiedTime"
> & {
  notionId?: string;
};

/**
 * This is responsible for creating {@link DynamicCard} instances.
 */
export interface DynamicCardFactory {
  /**
   * Dynamic cards are identified by a unique category name.
   *
   * Conventionally it should start with the word "Special:", e.g.
   * "Special: Restaurant Ordering".
   */
  category: string;

  /**
   * Create a random dynamic card and return it.
   *
   * This will be the only card of its type (category) in the
   * deck.
   */
  create(options: DynamicCardCreateOptions): DynamicCard;
}

export class DynamicCardManager {
  private readonly factories: DynamicCardFactory[];
  private readonly factoryCategoryMap: Map<string, DynamicCardFactory>;

  constructor(factories: DynamicCardFactory[] = []) {
    this.factories = factories;
    this.factoryCategoryMap = new Map(factories.map((f) => [f.category, f]));
  }

  /**
   * Creates one random instance of each dynamic card type and
   * returns them all.
   */
  createAll(options: DynamicCardCreateOptions): AppCard[] {
    return this.factories.map((f) => this.createCard(f, options));
  }

  /**
   * Re-generate the dynamic cards so they have new random values.
   *
   * Non-dynamic cards will be unaffected.
   */
  regenerate(cards: AppCard[], options: DynamicCardCreateOptions): AppCard[] {
    return cards.map((card) => {
      if (card.category) {
        const factory = this.factoryCategoryMap.get(card.category ?? "");
        if (factory) {
          return this.createCard(factory, options);
        }
      }
      return card;
    });
  }

  private createCard(
    factory: DynamicCardFactory,
    options: DynamicCardCreateOptions,
  ): AppCard {
    return {
      notionId: undefined,
      ...factory.create(options),
      id: factory.category, // TODO: Maybe slugify this ID?
      category: factory.category,

      // We don't want this to constantly show up at the top of the deck
      // when it's ordered reverse chronologically, so just hard-code a
      // time in the past for now.
      createdTime: "2025-09-17T05:26:00.000Z",
      lastModifiedTime: "2025-09-17T05:26:00.000Z",
    };
  }
}
