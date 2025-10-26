import type { AppCard } from "./AppCard";
import type { Mode } from "./quizStateReducer";
import { type Vocalizer } from "./speech";
import { getAssetUrl } from "./assets";
import { Pronouncer } from "./Pronouncer";
import { FillInTheBlank } from "./FillInTheBlank";
import { AppCardPictures } from "./AppCardPictures";

interface QuestionDisplayProps {
  currentQuestion: AppCard;
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
        if (currentQuestion.fillInTheBlankItems) {
          return null;
        }
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
        return <AppCardPictures card={currentQuestion} />;
      case "reversepicture":
        if (currentQuestion.fillInTheBlankItems) {
          return null;
        }
        return currentQuestion.hangul;
    }
  };

  // Always use question-link for links, question-text for non-links
  const className = currentQuestion.url ? "question-link" : "question-text";

  return (
    <div className={`mode-${mode}`}>
      {currentQuestion.fillInTheBlankItems ? (
        <FillInTheBlank
          items={currentQuestion.fillInTheBlankItems}
          showAnswer={mode === "picture" ? false : true}
        />
      ) : undefined}
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
        hangul={currentQuestion.fullHangul ?? currentQuestion.hangul}
        vocalizer={vocalizer}
      />
    </div>
  );
}

export default QuestionDisplay;
