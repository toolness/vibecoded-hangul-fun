import { useMemo, useEffect } from "react";
import Select from "react-select";
import type { SingleValue } from "react-select";
import "./WordSelectionModal.css";
import type { DatabaseRow } from "./database-spec";

interface WordOption {
  value: string;
  label: string;
  data: DatabaseRow;
}

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
  // Convert words to React-Select options and sort alphabetically
  const options = useMemo(
    () =>
      [...words]
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map((word) => ({
          value: word.name || "",
          label: word.name || "",
          data: word,
        })),
    [words],
  );

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleChange = (newValue: SingleValue<WordOption>) => {
    if (newValue) {
      // Immediately select and close when a word is chosen
      onSelectWord(newValue.data);
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
          <Select
            className="word-select"
            classNamePrefix="word-select"
            value={null}
            onChange={handleChange}
            options={options}
            placeholder="Search for a word..."
            isClearable={false}
            isSearchable={true}
            autoFocus={true}
            menuIsOpen={true}
            styles={{
              control: (base) => ({
                ...base,
                minHeight: "40px",
              }),
              menu: (base) => ({
                ...base,
                position: "relative",
                marginTop: "0",
                marginBottom: "8px",
              }),
              menuList: (base) => ({
                ...base,
                maxHeight: "300px",
              }),
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default WordSelectionModal;
