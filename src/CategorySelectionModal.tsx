import { useMemo, useEffect } from "react";
import "./WordSelectionModal.css";
import "./CategorySelectionModal.css";
import type { DatabaseRow } from "./database-spec";

interface CategorySelectionModalProps {
  allQuestions: DatabaseRow[];
  currentCategory: string | undefined;
  onSelectCategory: (category: string | undefined) => void;
  onClose: () => void;
}

function CategorySelectionModal({
  allQuestions,
  currentCategory,
  onSelectCategory,
  onClose,
}: CategorySelectionModalProps) {
  // Extract unique categories from all questions
  const categories = useMemo(() => {
    const categorySet = new Set<string>();
    allQuestions.forEach((question) => {
      if (question.category) {
        categorySet.add(question.category);
      }
    });
    return Array.from(categorySet).sort();
  }, [allQuestions]);

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

  const handleCategoryClick = (category: string | undefined) => {
    onSelectCategory(category);
    onClose();
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
          <h2>Choose a category</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          <div className="category-pills-container">
            <button
              className={`category-pill ${currentCategory === undefined ? "category-pill--selected" : ""}`}
              onClick={() => handleCategoryClick(undefined)}
            >
              All categories
            </button>
            {categories.map((category) => (
              <button
                key={category}
                className={`category-pill ${currentCategory === category ? "category-pill--selected" : ""}`}
                onClick={() => handleCategoryClick(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CategorySelectionModal;
