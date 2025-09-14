import { useState, useEffect } from "react";
import "./HamburgerMenu.css";
import WordSelectionModal from "./WordSelectionModal";
import CategorySelectionModal from "./CategorySelectionModal";
import AboutModal from "./AboutModal";
import type { DatabaseRow } from "./database-spec";
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
  words: DatabaseRow[];
  allQuestions: DatabaseRow[];
  currentCategory: string | undefined;
  onSelectWord: (word: DatabaseRow) => void;
  onSelectCategory: (category: string | undefined) => void;
  mode: Mode;
  onSetMode: (mode: Mode) => void;
}

function HamburgerMenu({
  words,
  allQuestions,
  currentCategory,
  onSelectWord,
  onSelectCategory,
  mode,
  onSetMode,
}: HamburgerMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWordSelectionModalOpen, setIsWordSelectionModalOpen] =
    useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleChooseWord = () => {
    setIsMenuOpen(false);
    setIsWordSelectionModalOpen(true);
  };

  const handleChooseCategory = () => {
    setIsMenuOpen(false);
    setIsCategoryModalOpen(true);
  };

  const handleAbout = () => {
    setIsMenuOpen(false);
    setIsAboutModalOpen(true);
  };

  const handleCategorySelected = (category: string | undefined) => {
    onSelectCategory(category);
    setIsCategoryModalOpen(false);
  };

  const handleWordSelected = (word: DatabaseRow) => {
    onSelectWord(word);
    setIsWordSelectionModalOpen(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "W") {
        e.preventDefault();
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
            <button className="menu-link" onClick={handleChooseCategory}>
              Choose category&hellip;
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
        />
      )}

      {isCategoryModalOpen && (
        <CategorySelectionModal
          allQuestions={allQuestions}
          currentCategory={currentCategory}
          onSelectCategory={handleCategorySelected}
          onClose={() => setIsCategoryModalOpen(false)}
        />
      )}

      {isAboutModalOpen && (
        <AboutModal onClose={() => setIsAboutModalOpen(false)} />
      )}
    </div>
  );
}

export default HamburgerMenu;
