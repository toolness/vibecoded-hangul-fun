import { useCallback, useEffect, useState } from "react";
import "./AboutModal.css";
import {
  cacheAllMedia,
  clearMediaCache,
  getCacheStatus,
  resetApp,
  type CacheProgress,
} from "../mediaCache";
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

  const [cacheStatus, setCacheStatus] = useState<{
    cachedCount: number;
    totalCount: number;
  } | null>(null);
  const [progress, setProgress] = useState<CacheProgress | null>(null);

  const refreshCacheStatus = useCallback(async () => {
    const status = await getCacheStatus();
    setCacheStatus(status);
  }, []);

  useEffect(() => {
    refreshCacheStatus();
  }, [refreshCacheStatus]);

  const handleDownload = async () => {
    setProgress({ cached: 0, total: 0, inProgress: true });
    await cacheAllMedia(setProgress);
    await refreshCacheStatus();
    setProgress(null);
  };

  const handleClear = async () => {
    await clearMediaCache();
    await refreshCacheStatus();
  };

  const isFullyCached =
    cacheStatus &&
    cacheStatus.cachedCount === cacheStatus.totalCount &&
    cacheStatus.totalCount > 0;

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

      <div className="offline-section">
        <h3>Offline Mode</h3>
        {cacheStatus && (
          <p className="cache-status">
            {cacheStatus.cachedCount} / {cacheStatus.totalCount} media files
            cached
          </p>
        )}

        {progress && progress.inProgress ? (
          <div className="download-progress">
            <progress value={progress.cached} max={progress.total} />
            <span>
              Downloading... {progress.cached} / {progress.total}
            </span>
          </div>
        ) : (
          <div className="offline-buttons">
            {!isFullyCached && (
              <button onClick={handleDownload} className="download-button">
                Download for Offline
              </button>
            )}
            {cacheStatus && cacheStatus.cachedCount > 0 && (
              <button onClick={handleClear} className="clear-button">
                Clear Cache
              </button>
            )}
          </div>
        )}
      </div>

      <div className="troubleshooting-section">
        <h3>Troubleshooting</h3>
        <p className="troubleshooting-text">
          If the app isn&apos;t working correctly, try resetting it.
        </p>
        <button onClick={resetApp} className="reset-button">
          Reset App
        </button>
      </div>
    </Modal>
  );
}

export default AboutModal;
