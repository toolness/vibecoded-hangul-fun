import { useCallback } from "react";
import type { DatabaseRow } from "./database-spec";
import type { Mode } from "./quizStateReducer";
import SpeakerIcon from "./assets/Speaker_Icon.svg";
import { type Vocalizer } from "./speech";

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
  const handleSpeakerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Preventing the default behavior will ensure that
      // focus from the text field isn't lost if the user
      // is currently on it. Hopefully this won't cancel
      // the current composition session if the user is
      // in the middle of one (e.g. they may be tapping
      // the speaker icon to hear the word said aloud,
      // to translate it more accurately).
      e.preventDefault();

      vocalizer?.(currentQuestion.hangul);
    },
    [currentQuestion, vocalizer],
  );

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
          <img
            key={currentQuestion.imageUrl}
            className="question-picture"
            src={currentQuestion.imageUrl}
          />
        );
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
      {vocalizer && (
        <>
          {" "}
          <img
            src={SpeakerIcon}
            className="speaker-icon"
            onPointerDown={handleSpeakerPointerDown}
          />
        </>
      )}
    </div>
  );
}

export default QuestionDisplay;
