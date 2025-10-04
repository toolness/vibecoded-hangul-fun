import { useMemo } from "react";
import "./WordSelectionModal.css";
import "./CategorySelectionModal.css";
import type { WordDatabaseRow } from "./database-spec";
import Modal from "./Modal";

interface CategorySelectionModalProps {
  allQuestions: WordDatabaseRow[];
  currentCategory: string | undefined;
  onSelectCategory: (category: string | undefined) => void;
  onClose: () => void;
  previousFocus?: HTMLElement | null;
}

function CategorySelectionModal({
  allQuestions,
  currentCategory,
  onSelectCategory,
  onClose,
  previousFocus,
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

  const handleCategoryClick = (category: string | undefined) => {
    onSelectCategory(category);
    onClose();
  };

  return (
    <Modal
      title="Choose a category"
      onClose={onClose}
      previousFocus={previousFocus}
    >
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
    </Modal>
  );
}

export default CategorySelectionModal;
