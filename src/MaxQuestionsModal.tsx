import { useState } from "react";
import "./MaxQuestionsModal.css";
import Modal from "./Modal";

interface MaxQuestionsModalProps {
  currentMaxQuestions: number | undefined;
  onSetMaxQuestions: (maxQuestions: number | undefined) => void;
  onClose: () => void;
  previousFocus?: HTMLElement | null;
}

function MaxQuestionsModal({
  currentMaxQuestions,
  onSetMaxQuestions,
  onClose,
  previousFocus,
}: MaxQuestionsModalProps) {
  const [inputValue, setInputValue] = useState(
    currentMaxQuestions?.toString() ?? "",
  );

  const handleApply = () => {
    const value = inputValue.trim();
    if (value === "") {
      onSetMaxQuestions(undefined);
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue) && numValue > 0) {
        onSetMaxQuestions(numValue);
      }
    }
    onClose();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApply();
    }
  };

  const handleClear = () => {
    setInputValue("");
    onSetMaxQuestions(undefined);
    onClose();
  };

  return (
    <Modal
      title="Set maximum questions"
      onClose={onClose}
      previousFocus={previousFocus}
    >
      <div className="max-questions-container">
        <label htmlFor="max-questions-input" className="max-questions-label">
          Maximum number of questions:
        </label>
        <input
          id="max-questions-input"
          type="number"
          min="1"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          className="max-questions-input"
          placeholder="Leave empty for unlimited"
          autoFocus
        />
        <div className="max-questions-hint">
          Leave empty to have unlimited questions
        </div>
        <div className="max-questions-buttons">
          <button
            onClick={handleClear}
            className="button button-secondary"
            type="button"
          >
            Clear limit
          </button>
          <button
            onClick={handleApply}
            className="button button-primary"
            type="button"
          >
            Apply
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default MaxQuestionsModal;
