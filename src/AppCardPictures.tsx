import type { AppCard } from "./AppCard";
import { WordPicture } from "./WordPicture";

export function AppCardPictures(props: { card: AppCard }) {
  const { card } = props;

  return (
    <div className="question-pictures">
      <WordPicture picture={card.picture} />
      <div className="extra-question-pictures">
        {(card.extraWords ?? []).map((word) => {
          if (!word.picture) return null;
          return <WordPicture picture={word.picture} />;
        })}
      </div>
    </div>
  );
}
