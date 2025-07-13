import { useState } from "react";
import "./HamburgerMenu.css";

function HamburgerMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
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
          </div>
        </div>
      )}
    </div>
  );
}

export default HamburgerMenu;