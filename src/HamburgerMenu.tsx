import { useState } from "react";
import "./HamburgerMenu.css";
import WordSelectionModal from "./WordSelectionModal";
import type { DatabaseRow } from "./database-spec";
import type { Mode } from "./quizStateReducer";

const MODE_NAMES: { [k in Mode]: string } = {
  translate: "Translate",
  typingtutor: "Typing tutor",
};

const MODE_ORDER: Mode[] = Object.keys(MODE_NAMES) as Mode[];

interface HamburgerMenuProps {
  words: DatabaseRow[];
  onSelectWord: (word: DatabaseRow) => void;
  mode: Mode;
  onSetMode: (mode: Mode) => void;
}

function HamburgerMenu({
  words,
  onSelectWord,
  mode,
  onSetMode,
}: HamburgerMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleChooseWord = () => {
    setIsMenuOpen(false);
    setIsModalOpen(true);
  };

  const handleWordSelected = (word: DatabaseRow) => {
    onSelectWord(word);
    setIsModalOpen(false);
  };

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
            <a
              href="https://github.com/toolness/vibecoded-hangul-fun"
              target="_blank"
              rel="noopener noreferrer"
              className="menu-link"
            >
              About
            </a>
            <button className="menu-link" onClick={handleChooseWord}>
              Choose word&hellip;
            </button>
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

      {isModalOpen && (
        <WordSelectionModal
          words={words}
          onSelectWord={handleWordSelected}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

export default HamburgerMenu;
