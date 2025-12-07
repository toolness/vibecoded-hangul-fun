import { useEffect } from "react";
import confetti from "canvas-confetti";

interface ConfettiProps {
  show: boolean;
}

function Confetti({ show }: ConfettiProps) {
  useEffect(() => {
    if (show) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"],
      });
    }
  }, [show]);

  return null;
}

export default Confetti;
