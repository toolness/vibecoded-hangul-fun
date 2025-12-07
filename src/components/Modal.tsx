import { useEffect, useRef, type ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  previousFocus?: HTMLElement | null;
}

function Modal({
  title,
  onClose,
  children,
  className = "",
  previousFocus,
}: ModalProps) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // If previousFocus is provided, use it; otherwise capture current active element
    previousFocusRef.current =
      previousFocus || (document.activeElement as HTMLElement);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [onClose, previousFocus]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
      onClose();
    }
  };

  const handleCloseButton = () => {
    if (previousFocusRef.current) {
      previousFocusRef.current.focus();
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className={`modal-container ${className}`}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="modal-close"
            onClick={handleCloseButton}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default Modal;
