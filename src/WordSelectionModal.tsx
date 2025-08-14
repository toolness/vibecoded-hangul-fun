import { useState, useEffect, useMemo } from "react";
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
  const [selectedOption, setSelectedOption] = useState<WordOption | null>(null);

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

  useEffect(() => {
    // Set initial selection to first word
    if (options.length > 0) {
      setSelectedOption(options[0]);
    }
  }, [options]);

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
            value={selectedOption}
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
                marginTop: "8px",
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
