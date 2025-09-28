import type { DatabaseRow } from "./database-spec";

interface NotesSectionProps {
  currentQuestion: DatabaseRow;
  show: boolean;
}

export default function NotesSection({
  currentQuestion,
  show,
}: NotesSectionProps) {
  const { exampleSentence, notes } = currentQuestion;

  if (!show || (!notes && !exampleSentence)) return null;

  return (
    <div className="notes-section">
      {notes && <div>{currentQuestion.notes}</div>}
      {exampleSentence && (
        <div className={`example-sentence${notes ? " with-notes" : ""}`}>
          {exampleSentence.text}
          {/* TODO: Embed sentence audio if available. */}
        </div>
      )}
    </div>
  );
}
