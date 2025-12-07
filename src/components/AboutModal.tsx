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

  const relativeTime = (() => {
    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
    const diff = Date.now() - buildDate.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return rtf.format(-years, "year");
    if (months > 0) return rtf.format(-months, "month");
    if (days > 0) return rtf.format(-days, "day");
    if (hours > 0) return rtf.format(-hours, "hour");
    if (minutes > 0) return rtf.format(-minutes, "minute");
    return rtf.format(-seconds, "second");
  })();

  return (
    <Modal
      title="About"
      onClose={onClose}
      className="about-modal"
      previousFocus={previousFocus}
    >
      <p>
        Build Date: {formattedDate} ({relativeTime})
      </p>
    </Modal>
  );
}

export default AboutModal;
