import { useState, useEffect, useMemo } from "react";
import "./WordSelectionModal.css";
import type { DatabaseRow } from "./database-spec";

interface WordSelectionModalProps {
  words: DatabaseRow[];
  onSelectWord: (word: DatabaseRow) => void;
  onClose: () => void;
}

function WordSelectionModal({
  words,
  onSelectWord,
  onClose,
}: WordSelectionModalProps) {
  const [selectedWord, setSelectedWord] = useState<string>("");

  // Sort words alphabetically
  const sortedWords = useMemo(
    () => [...words].sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [words],
  );

  useEffect(() => {
    // Set initial selection to first word
    if (sortedWords.length > 0 && sortedWords[0].name) {
      setSelectedWord(sortedWords[0].name);
    }
  }, [sortedWords]);

  const handleSelect = () => {
    const word = sortedWords.find((w) => w.name === selectedWord);
    if (word) {
      onSelectWord(word);
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-container">
        <div className="modal-header">
          <h2>Choose a word</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <select
            className="word-select"
            value={selectedWord}
            onChange={(e) => setSelectedWord(e.target.value)}
            size={10}
          >
            {sortedWords.map((word) => (
              <option key={word.name} value={word.name}>
                {word.name}
              </option>
            ))}
          </select>
          <button className="select-button" onClick={handleSelect}>
            Select
          </button>
        </div>
      </div>
    </div>
  );
}

export default WordSelectionModal;
