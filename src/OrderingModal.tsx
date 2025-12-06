import "./DifficultyModal.css";
import Modal from "./Modal";
import type { Ordering } from "./quizStateReducer";

interface OrderingModalProps {
  currentOrdering: Ordering;
  onSetOrdering: (ordering: Ordering) => void;
  onClose: () => void;
  previousFocus?: HTMLElement | null;
}

const ORDERING_OPTIONS: Array<{
  value: Ordering;
  label: string;
  description: string;
}> = [
  {
    value: "created-by",
    label: "Created by",
    description: "Prioritize recently created words",
  },
  {
    value: "last-incorrect",
    label: "Last incorrect",
    description: "Prioritize words you recently got wrong",
  },
];

function OrderingModal({
  currentOrdering,
  onSetOrdering,
  onClose,
  previousFocus,
}: OrderingModalProps) {
  const handleOrderingClick = (ordering: Ordering) => {
    onSetOrdering(ordering);
    onClose();
  };

  return (
    <Modal
      title="Choose ordering"
      onClose={onClose}
      previousFocus={previousFocus}
    >
      <div className="difficulty-container">
        <div className="difficulty-options">
          {ORDERING_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleOrderingClick(option.value)}
              className={`difficulty-option ${currentOrdering === option.value ? "difficulty-selected" : ""}`}
            >
              <div className="difficulty-label">
                {currentOrdering === option.value && "✓ "}
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

export default OrderingModal;
