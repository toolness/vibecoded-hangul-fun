import { useEffect, useState } from "react";
import "./Confetti.css";

interface ConfettiProps {
  show: boolean;
}

function Confetti({ show }: ConfettiProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 2000);
      return () => {
        setIsVisible(false);
        clearTimeout(timer);
      };
    }
  }, [show]);

  if (!isVisible) return null;

  const confettiPieces = Array.from({ length: 50 }, (_, i) => (
    <div
      key={i}
      className="confetti-piece"
      style={{
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 0.5}s`,
        backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
      }}
    />
  ));

  return <div className="confetti-container">{confettiPieces}</div>;
}

export default Confetti;
