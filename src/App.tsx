import "./App.css";
import {
  useReducer,
  useEffect,
  useState,
  useRef,
  type ActionDispatch,
  useMemo,
} from "react";
import type { AppCard } from "./AppCard";
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
import { WordPicture } from "./WordPicture";
import NotesSection from "./NotesSection";
import NotionLogo from "./assets/Notion_Logo.svg";
import WikipediaLogo from "./assets/Wikipedia_Logo.svg";

const MODE_PROMPT: Record<Mode, string> = {
  typingtutor: "Type this Hangul:",
  translate: "Translate to Hangul:",
  picture: "Identify this picture:",
  reversepicture: "What does this word represent?",
  minimalpair: "Which word is being spoken?",
};

function App({
  initialMode,
  initialRows,
  initialQuestionId,
}: {
  initialMode: Mode;
  initialRows: AppCard[];
  initialQuestionId?: string;
}) {
  const vocalizer = useKoreanVocalizer();

  // State management
  const [state, dispatch] = useReducer(quizReducer, undefined, () => {
    return createInitialState(
      initialRows,
      {
        mode: initialMode,
        category: undefined,
        maxQuestions: undefined,
      },
      initialQuestionId,
    );
  });
  const {
    currentQuestion,
    mode,
    category,
    maxQuestions,
    allQuestions,
    allQuestionsFiltered,
  } = state;

  const handleWordSelection = (word: AppCard) => {
    dispatch({ type: "SET_QUESTION", question: word });
  };

  const handleSetMode = (newMode: Mode) => {
    dispatch({ type: "SET_OPTIONS", mode: newMode });
  };

  const handleSetCategory = (newCategory: string | undefined) => {
    dispatch({ type: "SET_OPTIONS", category: newCategory });
  };

  const handleSetMaxQuestions = (newMaxQuestions: number | undefined) => {
    dispatch({ type: "SET_OPTIONS", maxQuestions: newMaxQuestions });
  };

  const Answerer = ANSWERERS[mode];

  return (
    <main>
      <HamburgerMenu
        words={allQuestionsFiltered}
        allQuestions={allQuestions}
        currentCategory={category}
        currentMaxQuestions={maxQuestions}
        onSelectWord={handleWordSelection}
        onSelectCategory={handleSetCategory}
        onSetMaxQuestions={handleSetMaxQuestions}
        mode={mode}
        onSetMode={handleSetMode}
        currentQuestionId={currentQuestion.id}
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

      <div className="footer-links">
        <a
          // This needs to be www.notion.so in order to open the Notion app on Android.
          href={`https://www.notion.so/${currentQuestion.id.replace(/-/g, "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="footer-link"
        >
          <img src={NotionLogo} alt="Notion" className="notion-logo" />
        </a>
        {currentQuestion.url && currentQuestion.url.includes("wikipedia") && (
          <a
            href={currentQuestion.url}
            target="_blank"
            rel="noopener noreferrer"
            className="footer-link"
          >
            <img
              src={WikipediaLogo}
              alt="Wikipedia"
              className="wikipedia-logo"
            />
          </a>
        )}
      </div>
    </main>
  );
}

const ANSWERERS: { [k in Mode]: React.FC<AnswererProps> } = {
  translate: TypingModeAnswerer,
  typingtutor: TypingModeAnswerer,
  picture: TypingModeAnswerer,
  reversepicture: ReversePictureAnswerer,
  minimalpair: MinimalPairAnswerer,
};

type AnswererProps = {
  state: QuizState;
  dispatch: ActionDispatch<[action: QuizAction]>;
  vocalizer?: ReturnType<typeof useKoreanVocalizer>;
};

function ReversePictureAnswerer({ state, dispatch, vocalizer }: AnswererProps) {
  const [showAnswer, setShowAnswer] = useState(false);

  const { currentQuestion } = state;

  useEffect(() => {
    setShowAnswer(false);
  }, [currentQuestion]);

  const handleGiveUp = () => {
    setShowAnswer(true);
  };

  const handleSkip = () => {
    dispatch({ type: "NEXT_QUESTION" });
  };

  const handleNext = () => {
    dispatch({ type: "NEXT_QUESTION" });
  };

  return (
    <>
      <div>
        {showAnswer && <WordPicture picture={currentQuestion.picture} />}
      </div>

      <div className="button-section">
        {showAnswer ? (
          <button onClick={handleNext} className="button button-next">
            Next
          </button>
        ) : (
          <>
            <button onClick={handleSkip} className="button button-skip">
              Skip
            </button>
            <button onClick={handleGiveUp} className="button button-giveup">
              Show picture
            </button>
          </>
        )}
      </div>

      <NotesSection
        currentQuestion={currentQuestion}
        show={showAnswer}
        vocalizer={vocalizer}
      />
    </>
  );
}

function MinimalPairAnswerer({ state, dispatch, vocalizer }: AnswererProps) {
  const [selectedChoice, setSelectedChoice] = useState<AppCard | null>(null);
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

  const handleChoiceClick = (choice: AppCard) => {
    if (hasAnswered) return;

    setSelectedChoice(choice);
    if (choice === currentQuestion) {
      setShowConfetti(true);
    }
  };

  const getButtonClassName = (choice: AppCard) => {
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

      <NotesSection
        currentQuestion={currentQuestion}
        show={hasAnswered}
        vocalizer={vocalizer}
      />
    </>
  );
}

function TypingModeAnswerer(props: AnswererProps) {
  const { state, dispatch, vocalizer } = props;
  const [showConfetti, setShowConfetti] = useState(false);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const shouldNotFocusInputRef = useRef<boolean>(false);

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
    if (shouldNotFocusInputRef.current) {
      shouldNotFocusInputRef.current = false;
    } else {
      setTimeout(() => {
        inputRef.current?.focus();
        // scrollIntoView() isn't part of the testing framework, so check for
        // existence.
        if (inputRef.current?.scrollIntoView) {
          inputRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "center",
          });
        }
      }, 0);
    }
  }, [currentQuestion, mode]);

  const handleGiveUp = () => {
    dispatch({ type: "SHOW_ANSWER" });
    setTimeout(() => {
      nextButtonRef.current?.focus();
    }, 0);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: "UPDATE_INPUT", input: e.target.value });
  };

  const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && (isCompletelyCorrect || showAnswer)) {
      // Need to prevent default or Chrome on Android, in particular, will
      // not clear the input when we move to the next word.
      e.preventDefault();
      // Chrome on Android is extremely weird and we need this setTimeout
      // to ensure input is cleared.
      setTimeout(() => {
        handleNext();
      }, 100);
    }
  };

  const handleNext = () => {
    dispatch({ type: "NEXT_QUESTION" });
  };

  const handleSkip = () => {
    // Don't focus the input when we move to the next question,
    // b/c on mobile this makes the keyboard pop up, and the user
    // might not want that disruption if they're just flipping
    // through cards. Also, for keyboard-only users on desktop,
    // this keeps the focus on the "skip" button, which makes it
    // easy to flip through cards quickly be continuously pressing
    // enter.
    shouldNotFocusInputRef.current = true;
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
          <button
            ref={nextButtonRef}
            onClick={handleNext}
            className="button button-next"
          >
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

      <NotesSection
        currentQuestion={currentQuestion}
        show={showAnswer || isCompletelyCorrect}
        vocalizer={vocalizer}
      />
    </>
  );
}

export default App;
