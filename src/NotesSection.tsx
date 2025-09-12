import type { DatabaseRow } from "./database-spec";

interface NotesSectionProps {
  currentQuestion: DatabaseRow;
  show: boolean;
}

export default function NotesSection({
  currentQuestion,
  show,
}: NotesSectionProps) {
  const hasNotes = currentQuestion.notes;
  const hasExampleSentence = currentQuestion.exampleSentence;

  if (!show || (!hasNotes && !hasExampleSentence)) return null;

  return (
    <div className="notes-section">
      {hasNotes && <div>{currentQuestion.notes}</div>}
      {hasExampleSentence && (
        <div className={`example-sentence${hasNotes ? " with-notes" : ""}`}>
          {currentQuestion.exampleSentence}
        </div>
      )}
    </div>
  );
}
