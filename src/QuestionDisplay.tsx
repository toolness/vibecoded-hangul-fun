import type { DatabaseRow } from "./database-spec";
import type { Mode } from "./quizStateReducer";
import { type Vocalizer } from "./speech";
import { getAssetUrl } from "./assets";
import { Pronouncer } from "./Pronouncer";

interface QuestionDisplayProps {
  currentQuestion: DatabaseRow;
  mode: Mode;
  vocalizer: Vocalizer | null;
}

function QuestionPicture({ question }: { question: DatabaseRow }) {
  if (!question.picture) {
    // Generally this should never happen, as we should have pre-filtered questions
    // that have a picture.
    return null;
  }

  if (question.picture.type === "emojis") {
    return (
      <span className="question-picture question-emojis">
        {question.picture.emojis}
      </span>
    );
  }

  let src: string | undefined;
  if (question.picture.type === "remote-image") {
    src = question.picture.url;
  } else if (question.picture.type === "local-image") {
    src = getAssetUrl(question.picture.filename).href;
  }

  if (!src) {
    return null;
  }
  return <img className="question-picture" src={src} />;
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
        // Set `key` to force a full unmount/remount of the
        // image; otherwise some browsers will leave the old
        // image in place until the new one is fully loaded,
        // which can be confusing on slower network connections.
        return (
          <QuestionPicture
            key={currentQuestion.name}
            question={currentQuestion}
          />
        );
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
