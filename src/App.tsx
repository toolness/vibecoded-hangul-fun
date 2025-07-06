import "./App.css";
import { useState, useEffect } from "react";
import _database from "./database.json";
import type { DatabaseRow } from "./database-spec";

const DATABASE_ROWS: DatabaseRow[] = _database.filter(
  (row) => row.name && row.hangul,
);

function App() {
  // State management
  const [currentQuestion, setCurrentQuestion] = useState<DatabaseRow | null>(
    null,
  );
  const [userInput, setUserInput] = useState("");
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [incorrectQuestions, setIncorrectQuestions] = useState<Set<string>>(
    new Set(),
  );
  const [showAnswer, setShowAnswer] = useState(false);

  // Function to select next question
  const selectNextQuestion = () => {
    // Prioritize questions that haven't been shown or were answered incorrectly
    const unansweredOrIncorrect = DATABASE_ROWS.filter((row) => {
      const questionId = row.name;
      return (
        !answeredQuestions.has(questionId) || incorrectQuestions.has(questionId)
      );
    });

    // If we have unanswered or incorrect questions, pick from those
    const pool =
      unansweredOrIncorrect.length > 0 ? unansweredOrIncorrect : DATABASE_ROWS;

    // Select a random question from the pool
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex];
  };

  // Initialize with a random question
  useEffect(() => {
    if (!currentQuestion && DATABASE_ROWS.length > 0) {
      setCurrentQuestion(selectNextQuestion());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Calculate how many characters are correct
  const calculateCorrectCharacters = () => {
    if (!currentQuestion) return { correct: 0, total: 0 };

    const correctAnswer = currentQuestion.hangul;
    let correctCount = 0;

    for (let i = 0; i < userInput.length && i < correctAnswer.length; i++) {
      if (userInput[i] === correctAnswer[i]) {
        correctCount++;
      } else {
        break; // Stop counting after first incorrect character
      }
    }

    return { correct: correctCount, total: correctAnswer.length };
  };

  const { correct, total } = calculateCorrectCharacters();
  const isCompletelyCorrect = userInput === currentQuestion?.hangul;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };

  const handleGiveUp = () => {
    if (currentQuestion) {
      // Mark as incorrect since user gave up
      setIncorrectQuestions((prev) => new Set(prev).add(currentQuestion.name));
      // Also mark as answered
      setAnsweredQuestions((prev) => new Set(prev).add(currentQuestion.name));
    }
    setShowAnswer(true);
  };

  const handleNext = () => {
    if (currentQuestion && isCompletelyCorrect && !showAnswer) {
      // Mark as answered correctly (remove from incorrect if it was there)
      setAnsweredQuestions((prev) => new Set(prev).add(currentQuestion.name));
      setIncorrectQuestions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(currentQuestion.name);
        return newSet;
      });
    }

    // Reset state for next question
    setUserInput("");
    setShowAnswer(false);
    setCurrentQuestion(selectNextQuestion());
  };

  if (!currentQuestion) {
    return <main>Loading...</main>;
  }

  return (
    <main>
      <div className="quiz-container" data-testid="quiz-container">
        <div className="question-section">
          <h2 className="question-prompt">Translate to Hangul:</h2>
          <div className="question-name">
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
              {correct}/{total} characters correct
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
