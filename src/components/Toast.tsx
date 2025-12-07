import { useEffect, useState } from "react";
import "./Toast.css";

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

function Toast({ message, onClose, duration = 2000 }: ToastProps) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setIsClosing(true);
    }, duration - 300);

    const closeTimer = setTimeout(() => {
      onClose();
    }, duration);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  return (
    <div className={`toast ${isClosing ? "fade-out" : ""}`}>
      <div className="toast-content">{message}</div>
    </div>
  );
}

export default Toast;
