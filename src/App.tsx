import "./App.css";
import { useReducer, useEffect, useState, useRef } from "react";
import _database from "./database.json";
import type { DatabaseRow } from "./database-spec";
import { calculateCorrectKeystrokes } from "./calculateCorrectKeystrokes";
import { quizReducer, createInitialState } from "./quizStateReducer";
import { useKoreanVocalizer } from "./speech";
import HamburgerMenu from "./HamburgerMenu";
import QuestionDisplay from "./QuestionDisplay";
import Confetti from "./Confetti";

const DATABASE_ROWS: DatabaseRow[] = _database.filter(
  (row) => row.name && row.hangul,
);

/**
 * Helper to select a random question from a pool.
 */
function selectRandomQuestion(pool: DatabaseRow[]) {
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

function App() {
  const vocalizer = useKoreanVocalizer();
  const [showConfetti, setShowConfetti] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper to get initial random question
  const getInitialQuestion = () => selectRandomQuestion(DATABASE_ROWS);

  // State management
  const [state, dispatch] = useReducer(
    quizReducer,
    createInitialState(getInitialQuestion()),
  );
  const {
    currentQuestion,
    userInput,
    answeredQuestions,
    incorrectQuestions,
    showAnswer,
    isTypingTutorMode,
  } = state;

  // Function to select next question
  const selectNextQuestion = () => {
    // Prioritize questions that haven't been shown or were answered incorrectly
    const unansweredOrIncorrect = DATABASE_ROWS.filter((row) => {
      return !answeredQuestions.has(row) || incorrectQuestions.has(row);
    });

    // If we have unanswered or incorrect questions, pick from those
    const pool =
      unansweredOrIncorrect.length > 0 ? unansweredOrIncorrect : DATABASE_ROWS;

    return selectRandomQuestion(pool);
  };

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "UPDATE_INPUT", payload: e.target.value });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (isCompletelyCorrect || showAnswer)) {
      handleNext();
    }
  };

  const handleGiveUp = () => {
    // Mark as incorrect since user gave up
    dispatch({ type: "MARK_INCORRECT", payload: currentQuestion });
    dispatch({ type: "SHOW_ANSWER" });
  };

  const handleNext = () => {
    if (isCompletelyCorrect && !showAnswer) {
      // Mark as answered correctly (remove from incorrect if it was there)
      dispatch({ type: "MARK_CORRECT", payload: currentQuestion });
    }

    // Reset confetti for next question
    setShowConfetti(false);

    // Move to next question
    dispatch({ type: "NEXT_QUESTION", payload: selectNextQuestion() });

    // Focus the input field
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleSkip = () => {
    // Reset confetti for next question
    setShowConfetti(false);

    // Move to next question without marking as correct or incorrect
    dispatch({ type: "NEXT_QUESTION", payload: selectNextQuestion() });

    // Focus the input field
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleWordSelection = (word: DatabaseRow) => {
    setShowConfetti(false);
    dispatch({ type: "NEXT_QUESTION", payload: word });

    // Focus the input field
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleToggleTypingTutorMode = () => {
    dispatch({ type: "TOGGLE_TYPING_TUTOR_MODE" });
  };

  return (
    <main>
      <Confetti show={showConfetti} />
      <HamburgerMenu
        words={DATABASE_ROWS}
        onSelectWord={handleWordSelection}
        isTypingTutorMode={isTypingTutorMode}
        onToggleTypingTutorMode={handleToggleTypingTutorMode}
      />

      <div className="quiz-container" data-testid="quiz-container">
        <div className="question-section">
          <h2 className="question-prompt">
            {isTypingTutorMode ? "Type this Hangul:" : "Translate to Hangul:"}
          </h2>
          <div className="question-name">
            <QuestionDisplay
              currentQuestion={currentQuestion}
              isTypingTutorMode={isTypingTutorMode}
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
            onKeyDown={handleKeyDown}
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
