import { useCallback } from "react";
import type { DatabaseRow } from "./database-spec";
import SpeakerIcon from "./assets/Speaker_Icon.svg";
import { vocalizeKoreanSpeech } from "./speech";

interface QuestionDisplayProps {
  currentQuestion: DatabaseRow;
  isTypingTutorMode: boolean;
  supportsSpeech: boolean;
}

function QuestionDisplay({
  currentQuestion,
  isTypingTutorMode,
  supportsSpeech,
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

      vocalizeKoreanSpeech(currentQuestion.hangul);
    },
    [currentQuestion],
  );

  if (isTypingTutorMode) {
    return (
      <>
        <span data-testid="question-name" className="question-text hangul">
          {currentQuestion.hangul}
        </span>
        {supportsSpeech && (
          <>
            {" "}
            <img
              src={SpeakerIcon}
              className="speaker-icon"
              onPointerDown={handleSpeakerPointerDown}
            />
          </>
        )}
      </>
    );
  }

  return (
    <>
      {currentQuestion.url ? (
        <a
          href={currentQuestion.url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="question-name"
          className="question-link"
        >
          {currentQuestion.name}
        </a>
      ) : (
        <span data-testid="question-name" className="question-text">
          {currentQuestion.name}
        </span>
      )}
      {supportsSpeech && (
        <>
          {" "}
          <img
            src={SpeakerIcon}
            className="speaker-icon"
            onPointerDown={handleSpeakerPointerDown}
          />
        </>
      )}
    </>
  );
}

export default QuestionDisplay;
