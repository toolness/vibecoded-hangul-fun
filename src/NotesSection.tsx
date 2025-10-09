import type { AppCard } from "./AppCard";
import { Pronouncer } from "./Pronouncer";
import { getAssetUrl } from "./assets";
import type { Vocalizer } from "./speech";

interface NotesSectionProps {
  currentQuestion: AppCard;
  show: boolean;
  vocalizer?: Vocalizer | null;
}

export default function NotesSection({
  currentQuestion,
  show,
  vocalizer,
}: NotesSectionProps) {
  const { exampleSentence, notes } = currentQuestion;

  if (!show || (!notes && !exampleSentence)) return null;

  return (
    <div className="notes-section">
      {notes && <div>{currentQuestion.notes}</div>}
      {exampleSentence && (
        <div className={`example-sentence${notes ? " with-notes" : ""}`}>
          {exampleSentence.text}
          <Pronouncer
            audioUrl={
              exampleSentence.audio && getAssetUrl(exampleSentence.audio).href
            }
            hangul={exampleSentence.text}
            vocalizer={vocalizer || null}
          />
        </div>
      )}
    </div>
  );
}
