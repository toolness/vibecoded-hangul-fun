import "./AboutModal.css";
import Modal from "./Modal";

interface AboutModalProps {
  onClose: () => void;
  previousFocus?: HTMLElement | null;
}

function AboutModal({ onClose, previousFocus }: AboutModalProps) {
  const buildDate = new Date(__BUILD_DATE__);
  const formattedDate = buildDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <Modal
      title="About"
      onClose={onClose}
      className="about-modal"
      previousFocus={previousFocus}
    >
      <p>Build Date: {formattedDate}</p>
    </Modal>
  );
}

export default AboutModal;
