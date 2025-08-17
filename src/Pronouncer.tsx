import { useCallback, useRef } from "react";
import SpeakerIcon from "./assets/Speaker_Icon.svg";
import type { Vocalizer } from "./speech";

export function Pronouncer(props: {
  audioUrl: string | undefined;
  hangul: string;
  vocalizer: Vocalizer | null;
}) {
  const { audioUrl, hangul, vocalizer } = props;
  const audioRef = useRef<HTMLAudioElement>(null);
  const showSpeakerIcon = Boolean(vocalizer || audioUrl);
  const handleSpeakerPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Preventing the default behavior will ensure that
      // focus from the text field isn't lost if the user
      // is currently on it. Hopefully this won't cancel
      // the current composition session if the user is
      // in the middle of one (e.g. they may be tapping
      // the speaker icon to hear the word said aloud,
      // to translate it more accurately).
      e.preventDefault();

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      } else if (vocalizer) {
        vocalizer(hangul);
      }
    },
    [hangul, vocalizer],
  );

  return (
    <>
      {audioUrl ? (
        <audio
          // Not sure if we need key but who knows if some browsers
          // behave strangely when only the src is changed, so
          // let's do a full unmount/remount just in case.
          key={audioUrl}
          ref={audioRef}
          // Pronunciations aren't expected to be large and
          // we want them to be ready for playback as soon as
          // the user asks for them, so always preload them.
          preload="auto"
          src={audioUrl}
        />
      ) : undefined}
      {showSpeakerIcon && (
        <>
          {" "}
          <img
            src={SpeakerIcon}
            className="speaker-icon"
            onPointerDown={handleSpeakerPointerDown}
          />
        </>
      )}
    </>
  );
}
