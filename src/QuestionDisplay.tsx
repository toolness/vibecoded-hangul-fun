import { useCallback, useRef } from "react";
import type { DatabaseRow } from "./database-spec";
import type { Mode } from "./quizStateReducer";
import SpeakerIcon from "./assets/Speaker_Icon.svg";
import { type Vocalizer } from "./speech";
import { getAssetUrl } from "./assets";

interface QuestionDisplayProps {
  currentQuestion: DatabaseRow;
  mode: Mode;
  vocalizer: Vocalizer | null;
}

function QuestionPicture({ question }: { question: DatabaseRow }) {
  let src = question.imageUrl;
  if (!src && question.image) {
    src = getAssetUrl(question.image).href;
  }
  if (!src) {
    // Generally this should never happen, as we should have pre-filtered questions
    // that have an image.
    return null;
  }
  return <img className="question-picture" src={src} />;
}

function QuestionDisplay({
  currentQuestion,
  mode,
  vocalizer,
}: QuestionDisplayProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const showSpeakerIcon = Boolean(vocalizer || currentQuestion.audio);
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

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      } else if (vocalizer) {
        vocalizer(currentQuestion.hangul);
      }
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
          <QuestionPicture
            key={currentQuestion.name}
            question={currentQuestion}
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
      {currentQuestion.audio ? (
        <audio
          // Not sure if we need key but who knows if some browsers
          // behave strangely when only the src is changed, so
          // let's do a full unmount/remount just in case.
          key={currentQuestion.audio}
          ref={audioRef}
          // Pronunciations aren't expected to be large and
          // we want them to be ready for playback as soon as
          // the user asks for them, so always preload them.
          preload="auto"
          src={getAssetUrl(currentQuestion.audio).href}
        />
      ) : undefined}
      {showSpeakerIcon && (
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
