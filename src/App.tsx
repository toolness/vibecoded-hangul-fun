import "./App.css";
import { useReducer, useEffect, useState, useRef } from "react";
import type { DatabaseRow } from "./database-spec";
import { calculateCorrectKeystrokes } from "./calculateCorrectKeystrokes";
import { quizReducer, createInitialState, type Mode } from "./quizStateReducer";
import { useKoreanVocalizer } from "./speech";
import HamburgerMenu from "./HamburgerMenu";
import QuestionDisplay from "./QuestionDisplay";
import Confetti from "./Confetti";

const MODE_PROMPT: Record<Mode, string> = {
  typingtutor: "Type this Hangul:",
  translate: "Translate to Hangul:",
  picture: "Identify this picture:",
  minimalpair: "Which word is being spoken?",
};

function App({
  initialMode,
  initialRows,
}: {
  initialMode: Mode;
  initialRows: DatabaseRow[];
}) {
  const vocalizer = useKoreanVocalizer();
  const [showConfetti, setShowConfetti] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // State management
  const [state, dispatch] = useReducer(quizReducer, undefined, () => {
    return createInitialState(initialRows, initialMode, undefined);
  });
  const {
    currentQuestion,
    userInput,
    showAnswer,
    mode,
    category,
    allQuestions,
    allQuestionsFiltered,
  } = state;

  const { correct, total } = calculateCorrectKeystrokes(
    currentQuestion.hangul || "",
    userInput,
  );
  const isCompletelyCorrect = userInput === currentQuestion.hangul;

  // Trigger confetti when user completes the word correctly
  useEffect(() => {
    if (isCompletelyCorrect && !showAnswer) {
      setShowConfetti(true);
    }
  }, [isCompletelyCorrect, showAnswer]);

  useEffect(() => {
    // Reset confetti for next question
    setShowConfetti(false);

    // Focus the input field
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, [currentQuestion, mode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "UPDATE_INPUT", input: e.target.value });
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (isCompletelyCorrect || showAnswer)) {
      handleNext();
    }
  };

  const handleGiveUp = () => {
    dispatch({ type: "SHOW_ANSWER" });
  };

  const handleNext = () => {
    dispatch({ type: "NEXT_QUESTION" });
  };

  const handleSkip = () => {
    dispatch({ type: "NEXT_QUESTION" });
  };

  const handleWordSelection = (word: DatabaseRow) => {
    dispatch({ type: "SET_QUESTION", question: word });
  };

  const handleSetMode = (newMode: Mode) => {
    dispatch({ type: "SET_MODE", mode: newMode });
  };

  const handleSetCategory = (newCategory: string | undefined) => {
    dispatch({ type: "SET_CATEGORY", category: newCategory });
  };

  return (
    <main>
      <Confetti show={showConfetti} />
      <HamburgerMenu
        words={allQuestionsFiltered}
        allQuestions={allQuestions}
        currentCategory={category}
        onSelectWord={handleWordSelection}
        onSelectCategory={handleSetCategory}
        mode={mode}
        onSetMode={handleSetMode}
      />

      <div className="quiz-container" data-testid="quiz-container">
        <div className="question-section">
          <h2 className="question-prompt">{MODE_PROMPT[mode]}</h2>
          <div className="question-name">
            <QuestionDisplay
              currentQuestion={currentQuestion}
              mode={mode}
              vocalizer={vocalizer}
            />
          </div>
        </div>

        <div className="input-section">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={handleInputChange}
            onKeyUp={handleKeyUp}
            data-testid="hangul-input"
            className="hangul-input"
            placeholder="Enter Hangul..."
            autoFocus
          />

          {userInput && !showAnswer && (
            <div
              data-testid="character-feedback"
              className="character-feedback"
            >
              {correct}/{total} keystrokes correct
            </div>
          )}

          {showAnswer && (
            <div data-testid="correct-answer" className="correct-answer">
              <strong>Answer:</strong>{" "}
              <span className="hangul-answer">{currentQuestion.hangul}</span>
            </div>
          )}
        </div>

        <div className="button-section">
          {showAnswer || isCompletelyCorrect ? (
            <button onClick={handleNext} className="button button-next">
              Next
            </button>
          ) : (
            <>
              <button onClick={handleSkip} className="button button-skip">
                Skip
              </button>
              <button onClick={handleGiveUp} className="button button-giveup">
                Give up
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
