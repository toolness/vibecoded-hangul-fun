import "./App.css";
import { useReducer, useMemo } from "react";
import _database from "./database.json";
import type { DatabaseRow } from "./database-spec";
import { calculateCorrectJamos } from "./calculateCorrectJamos";
import { quizReducer, createInitialState } from "./quizStateReducer";
import { supportsKoreanSpeech } from "./speech";
import HamburgerMenu from "./HamburgerMenu";
import QuestionDisplay from "./QuestionDisplay";

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
  const supportsSpeech = useMemo(supportsKoreanSpeech, []);

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

  const { correct, total } = calculateCorrectJamos(
    currentQuestion.hangul || "",
    userInput,
  );
  const isCompletelyCorrect = userInput === currentQuestion.hangul;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "UPDATE_INPUT", payload: e.target.value });
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

    // Move to next question
    dispatch({ type: "NEXT_QUESTION", payload: selectNextQuestion() });
  };

  const handleWordSelection = (word: DatabaseRow) => {
    dispatch({ type: "NEXT_QUESTION", payload: word });
  };

  const handleToggleTypingTutorMode = () => {
    dispatch({ type: "TOGGLE_TYPING_TUTOR_MODE" });
  };

  return (
    <main>
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
              supportsSpeech={supportsSpeech}
            />
          </div>
        </div>

        <div className="input-section">
          <input
            type="text"
            value={userInput}
            onChange={handleInputChange}
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
              {correct}/{total} jamos correct
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
            <button onClick={handleGiveUp} className="button button-giveup">
              Give up
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
