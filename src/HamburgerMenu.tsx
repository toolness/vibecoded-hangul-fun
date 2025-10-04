import { useState, useEffect, useRef } from "react";
import "./HamburgerMenu.css";
import WordSelectionModal from "./WordSelectionModal";
import CategorySelectionModal from "./CategorySelectionModal";
import MaxQuestionsModal from "./MaxQuestionsModal";
import AboutModal from "./AboutModal";
import Toast from "./Toast";
import type { WordDatabaseRow } from "./database-spec";
import type { Mode } from "./quizStateReducer";

const MODE_NAMES: { [k in Mode]: string } = {
  translate: "Translate",
  typingtutor: "Typing tutor",
  picture: "Picture",
  reversepicture: "Reverse picture",
  minimalpair: "Minimal pair",
};

const MODE_ORDER: Mode[] = Object.keys(MODE_NAMES) as Mode[];

interface HamburgerMenuProps {
  words: WordDatabaseRow[];
  allQuestions: WordDatabaseRow[];
  currentCategory: string | undefined;
  currentMaxQuestions: number | undefined;
  onSelectWord: (word: WordDatabaseRow) => void;
  onSelectCategory: (category: string | undefined) => void;
  onSetMaxQuestions: (maxQuestions: number | undefined) => void;
  mode: Mode;
  onSetMode: (mode: Mode) => void;
  currentQuestionId: string | undefined;
}

function HamburgerMenu({
  words,
  allQuestions,
  currentCategory,
  currentMaxQuestions,
  onSelectWord,
  onSelectCategory,
  onSetMaxQuestions,
  mode,
  onSetMode,
  currentQuestionId,
}: HamburgerMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWordSelectionModalOpen, setIsWordSelectionModalOpen] =
    useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isMaxQuestionsModalOpen, setIsMaxQuestionsModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleChooseWord = () => {
    setIsMenuOpen(false);
    previousFocusRef.current = document.activeElement as HTMLElement;
    setIsWordSelectionModalOpen(true);
  };

  const handleChooseCategory = () => {
    setIsMenuOpen(false);
    previousFocusRef.current = document.activeElement as HTMLElement;
    setIsCategoryModalOpen(true);
  };

  const handleMaxQuestions = () => {
    setIsMenuOpen(false);
    previousFocusRef.current = document.activeElement as HTMLElement;
    setIsMaxQuestionsModalOpen(true);
  };

  const handleAbout = () => {
    setIsMenuOpen(false);
    previousFocusRef.current = document.activeElement as HTMLElement;
    setIsAboutModalOpen(true);
  };

  const handleShare = async () => {
    setIsMenuOpen(false);
    if (!currentQuestionId) {
      return;
    }
    const shareUrl = `${location.origin}${location.pathname}?iid=${currentQuestionId}&imode=${mode}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowToast(true);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  const handleCategorySelected = (category: string | undefined) => {
    onSelectCategory(category);
    setIsCategoryModalOpen(false);
  };

  const handleMaxQuestionsSet = (maxQuestions: number | undefined) => {
    onSetMaxQuestions(maxQuestions);
    setIsMaxQuestionsModalOpen(false);
  };

  const handleWordSelected = (word: WordDatabaseRow) => {
    onSelectWord(word);
    setIsWordSelectionModalOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "W") {
        e.preventDefault();
        previousFocusRef.current = document.activeElement as HTMLElement;
        setIsWordSelectionModalOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="hamburger-menu">
      <button
        className="hamburger-button"
        onClick={toggleMenu}
        aria-label="Toggle menu"
      >
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
        <span className="hamburger-line"></span>
      </button>

      {isMenuOpen && (
        <div className="menu-dropdown">
          <div className="menu-content">
            <button className="menu-link" onClick={handleAbout}>
              About
            </button>
            <button className="menu-link" onClick={handleShare}>
              Copy permalink
            </button>
            <button className="menu-link" onClick={handleChooseCategory}>
              Choose category&hellip;
            </button>
            <button className="menu-link" onClick={handleMaxQuestions}>
              Max words&hellip;
            </button>
            <button className="menu-link" onClick={handleChooseWord}>
              Choose word&hellip;
            </button>
            <hr className="menu-divider" />
            {MODE_ORDER.map((modeToChoose) => {
              return (
                <button
                  key={modeToChoose}
                  className="menu-link"
                  onClick={() => {
                    onSetMode(modeToChoose);
                    setIsMenuOpen(false);
                  }}
                >
                  {mode === modeToChoose && "✓ "}
                  {MODE_NAMES[modeToChoose]} mode
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isWordSelectionModalOpen && (
        <WordSelectionModal
          words={words}
          onSelectWord={handleWordSelected}
          onClose={() => setIsWordSelectionModalOpen(false)}
          previousFocus={previousFocusRef.current}
        />
      )}

      {isCategoryModalOpen && (
        <CategorySelectionModal
          allQuestions={allQuestions}
          currentCategory={currentCategory}
          onSelectCategory={handleCategorySelected}
          onClose={() => setIsCategoryModalOpen(false)}
          previousFocus={previousFocusRef.current}
        />
      )}

      {isMaxQuestionsModalOpen && (
        <MaxQuestionsModal
          currentMaxQuestions={currentMaxQuestions}
          onSetMaxQuestions={handleMaxQuestionsSet}
          onClose={() => setIsMaxQuestionsModalOpen(false)}
          previousFocus={previousFocusRef.current}
        />
      )}

      {isAboutModalOpen && (
        <AboutModal
          onClose={() => setIsAboutModalOpen(false)}
          previousFocus={previousFocusRef.current}
        />
      )}

      {showToast && (
        <Toast
          message="URL copied to clipboard."
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}

export default HamburgerMenu;
