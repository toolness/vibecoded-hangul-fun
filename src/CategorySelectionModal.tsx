import { useState, useEffect, useMemo } from "react";
import "./WordSelectionModal.css";
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
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    currentCategory,
  );

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

  useEffect(() => {
    // Set initial selection to current category or "All"
    setSelectedCategory(currentCategory);
  }, [currentCategory]);

  const handleSelect = () => {
    onSelectCategory(selectedCategory);
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
          <select
            className="word-select"
            value={selectedCategory || ""}
            onChange={(e) => setSelectedCategory(e.target.value || undefined)}
            size={10}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
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

export default CategorySelectionModal;
