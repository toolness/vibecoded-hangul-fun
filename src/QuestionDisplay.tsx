import type { DatabaseRow } from "./database-spec";
import type { Mode } from "./quizStateReducer";
import { type Vocalizer } from "./speech";
import { getAssetUrl } from "./assets";
import { Pronouncer } from "./Pronouncer";
import { WordPicture } from "./WordPicture";

interface QuestionDisplayProps {
  currentQuestion: DatabaseRow;
  mode: Mode;
  vocalizer: Vocalizer | null;
}

function QuestionDisplay({
  currentQuestion,
  mode,
  vocalizer,
}: QuestionDisplayProps) {
  const getQuestion = (): React.ReactNode => {
    switch (mode) {
      case "typingtutor":
        return currentQuestion.hangul;
      case "translate":
        return currentQuestion.name;
      case "picture":
        // I used to provide a `key` here to force a full
        // re-mount, because in the case of images, the old
        // image would still be showing while the new one is
        // loading. However, I later made the app a PWA so
        // latency isn't really an issue anymore, and having
        // the old image show for a split-second is better than
        // making it disappear entirely, as the latter causes
        // more layout instability.
        return <WordPicture picture={currentQuestion.picture} />;
      case "reversepicture":
        return currentQuestion.hangul;
    }
  };

  // Always use question-link for links, question-text for non-links
  const className = currentQuestion.url ? "question-link" : "question-text";

  return (
    <div className={`mode-${mode}`}>
      {currentQuestion.url ? (
        <a
          href={currentQuestion.url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="question-name"
          className={className}
          title={mode !== "translate" ? currentQuestion.name : undefined}
        >
          {getQuestion()}
        </a>
      ) : (
        <span data-testid="question-name" className={className}>
          {getQuestion()}
        </span>
      )}
      <Pronouncer
        audioUrl={
          currentQuestion.audio
            ? getAssetUrl(currentQuestion.audio).href
            : undefined
        }
        hangul={currentQuestion.hangul}
        vocalizer={vocalizer}
      />
    </div>
  );
}

export default QuestionDisplay;
