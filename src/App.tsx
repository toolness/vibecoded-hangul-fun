import "./App.css";
import {
  useReducer,
  useEffect,
  useState,
  useRef,
  type ActionDispatch,
  useMemo,
} from "react";
import type { DatabaseRow } from "./database-spec";
import { calculateCorrectKeystrokes } from "./calculateCorrectKeystrokes";
import {
  quizReducer,
  createInitialState,
  type Mode,
  type QuizState,
  type QuizAction,
} from "./quizStateReducer";
import { useKoreanVocalizer } from "./speech";
import HamburgerMenu from "./HamburgerMenu";
import QuestionDisplay from "./QuestionDisplay";
import Confetti from "./Confetti";
import { Pronouncer } from "./Pronouncer";
import { getAssetUrl } from "./assets";

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

  // State management
  const [state, dispatch] = useReducer(quizReducer, undefined, () => {
    return createInitialState(initialRows, initialMode, undefined);
  });
  const {
    currentQuestion,
    mode,
    category,
    allQuestions,
    allQuestionsFiltered,
  } = state;

  const handleWordSelection = (word: DatabaseRow) => {
    dispatch({ type: "SET_QUESTION", question: word });
  };

  const handleSetMode = (newMode: Mode) => {
    dispatch({ type: "SET_MODE", mode: newMode });
  };

  const handleSetCategory = (newCategory: string | undefined) => {
    dispatch({ type: "SET_CATEGORY", category: newCategory });
  };

  const Answerer = ANSWERERS[mode];

  return (
    <main>
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

        <Answerer state={state} dispatch={dispatch} vocalizer={vocalizer} />
      </div>
    </main>
  );
}

const ANSWERERS: { [k in Mode]: React.FC<AnswererProps> } = {
  translate: TypingModeAnswerer,
  typingtutor: TypingModeAnswerer,
  picture: TypingModeAnswerer,
  minimalpair: MinimalPairAnswerer,
};

type AnswererProps = {
  state: QuizState;
  dispatch: ActionDispatch<[action: QuizAction]>;
  vocalizer?: ReturnType<typeof useKoreanVocalizer>;
};

function MinimalPairAnswerer({ state, dispatch, vocalizer }: AnswererProps) {
  const [selectedChoice, setSelectedChoice] = useState<DatabaseRow | null>(
    null,
  );
  const [showConfetti, setShowConfetti] = useState(false);

  const handleSkip = () => {
    dispatch({ type: "NEXT_QUESTION" });
  };

  const handleNext = () => {
    setSelectedChoice(null);
    setShowConfetti(false);
    dispatch({ type: "NEXT_QUESTION" });
  };

  const { currentQuestion, allQuestionsFiltered } = state;

  const choices = useMemo(() => {
    const minimalPairIds = new Set(currentQuestion.minimalPairs ?? []);
    const choices = allQuestionsFiltered.filter(
      (question) =>
        question === currentQuestion || minimalPairIds.has(question.id),
    );
    choices.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }
      if (a.name > b.name) {
        return 1;
      }
      return 0;
    });
    return choices;
  }, [allQuestionsFiltered, currentQuestion]);

  const hasAnswered = selectedChoice !== null;

  useEffect(() => {
    setSelectedChoice(null);
    setShowConfetti(false);
  }, [currentQuestion]);

  const handleChoiceClick = (choice: DatabaseRow) => {
    if (hasAnswered) return;

    setSelectedChoice(choice);
    if (choice === currentQuestion) {
      setShowConfetti(true);
    }
  };

  const getButtonClassName = (choice: DatabaseRow) => {
    if (!hasAnswered) {
      return "button choice-button";
    }
    if (choice === currentQuestion) {
      return "button choice-button choice-correct";
    }
    if (choice === selectedChoice) {
      return "button choice-button choice-wrong";
    }
    return "button choice-button";
  };

  return (
    <>
      <Confetti show={showConfetti} />

      <div className="choices-grid">
        {choices.map((choice) => (
          <button
            key={choice.id}
            onClick={() => handleChoiceClick(choice)}
            className={getButtonClassName(choice)}
            disabled={hasAnswered}
          >
            {choice.hangul} ({choice.name})
            {hasAnswered && (
              <Pronouncer
                audioUrl={
                  choice.audio ? getAssetUrl(choice.audio).href : undefined
                }
                hangul={choice.hangul}
                vocalizer={vocalizer || null}
              />
            )}
          </button>
        ))}
      </div>

      <div className="button-section">
        {hasAnswered ? (
          <button onClick={handleNext} className="button button-next">
            Next
          </button>
        ) : (
          <button onClick={handleSkip} className="button button-skip">
            Skip
          </button>
        )}
      </div>
    </>
  );
}

function TypingModeAnswerer(props: AnswererProps) {
  const { state, dispatch } = props;
  const [showConfetti, setShowConfetti] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentQuestion, userInput, showAnswer, mode } = state;

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

  const handleGiveUp = () => {
    dispatch({ type: "SHOW_ANSWER" });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "UPDATE_INPUT", input: e.target.value });
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (isCompletelyCorrect || showAnswer)) {
      handleNext();
    }
  };

  const handleNext = () => {
    dispatch({ type: "NEXT_QUESTION" });
  };

  const handleSkip = () => {
    dispatch({ type: "NEXT_QUESTION" });
  };

  return (
    <>
      <Confetti show={showConfetti} />

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
          <div data-testid="character-feedback" className="character-feedback">
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
    </>
  );
}

export default App;
