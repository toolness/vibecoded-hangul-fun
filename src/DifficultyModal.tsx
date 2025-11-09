import "./DifficultyModal.css";
import Modal from "./Modal";
import type { Difficulty } from "./quizStateReducer";

interface DifficultyModalProps {
  currentDifficulty: Difficulty;
  onSetDifficulty: (difficulty: Difficulty) => void;
  onClose: () => void;
  previousFocus?: HTMLElement | null;
}

const DIFFICULTY_OPTIONS: Array<{
  value: Difficulty;
  label: string;
  description: string;
}> = [
  {
    value: "easy",
    label: "Easy",
    description: "Simpler numbers and challenges",
  },
  {
    value: "medium",
    label: "Medium",
    description: "Moderate difficulty",
  },
  {
    value: "hard",
    label: "Hard",
    description: "More complex numbers and challenges",
  },
];

function DifficultyModal({
  currentDifficulty,
  onSetDifficulty,
  onClose,
  previousFocus,
}: DifficultyModalProps) {
  const handleDifficultyClick = (difficulty: Difficulty) => {
    onSetDifficulty(difficulty);
    onClose();
  };

  return (
    <Modal
      title="Choose difficulty"
      onClose={onClose}
      previousFocus={previousFocus}
    >
      <div className="difficulty-container">
        <div className="difficulty-options">
          {DIFFICULTY_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleDifficultyClick(option.value)}
              className={`difficulty-option ${currentDifficulty === option.value ? "difficulty-selected" : ""}`}
            >
              <div className="difficulty-label">
                {currentDifficulty === option.value && "✓ "}
                {option.label}
              </div>
              <div className="difficulty-description">{option.description}</div>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export default DifficultyModal;
