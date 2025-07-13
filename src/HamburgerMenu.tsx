import { useState } from "react";
import "./HamburgerMenu.css";
import WordSelectionModal from "./WordSelectionModal";
import type { DatabaseRow } from "./database-spec";

interface HamburgerMenuProps {
  words: DatabaseRow[];
  onSelectWord: (word: DatabaseRow) => void;
}

function HamburgerMenu({ words, onSelectWord }: HamburgerMenuProps) {
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
            <button
              className="menu-link"
              onClick={handleChooseWord}
            >
              Choose word
            </button>
            <a
              href="https://github.com/toolness/vibecoded-hangul-fun"
              target="_blank"
              rel="noopener noreferrer"
              className="menu-link"
            >
              About
            </a>
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
