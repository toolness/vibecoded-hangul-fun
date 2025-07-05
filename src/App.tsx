import { useState, useEffect } from 'react';
import './App.css'
import _database from "./database.json";
import type { DatabaseRow } from './database-spec';

const DATABASE_ROWS: DatabaseRow[] = _database.filter(row => row.name && row.hangul);

function App() {
  const [shownIndices, setShownIndices] = useState<Set<number>>(new Set());
  const [incorrectIndices, setIncorrectIndices] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);

  const pickRandomRow = () => {
    // Prioritize rows that were answered incorrectly or never shown
    const priorityIndices: number[] = [];
    const availableIndices: number[] = [];
    
    DATABASE_ROWS.forEach((_, index) => {
      // Exclude the current index to ensure we always pick a different word
      if (index === currentIndex) {
        return;
      }
      
      if (incorrectIndices.has(index)) {
        priorityIndices.push(index);
      } else if (!shownIndices.has(index)) {
        availableIndices.push(index);
      }
    });
    
    // First try incorrect answers, then unshown, then any (excluding current)
    let candidateIndices = priorityIndices.length > 0 ? priorityIndices :
                          availableIndices.length > 0 ? availableIndices :
                          Array.from({ length: DATABASE_ROWS.length }, (_, i) => i)
                            .filter(i => i !== currentIndex);
    
    // If we only have one word in the database, we have to show the same one
    if (candidateIndices.length === 0) {
      candidateIndices = [currentIndex ?? 0];
    }
    
    const randomIndex = candidateIndices[Math.floor(Math.random() * candidateIndices.length)];
    setCurrentIndex(randomIndex);
    setUserInput('');
    setShowAnswer(false);
    
    // Mark as shown
    setShownIndices(prev => new Set(prev).add(randomIndex));
  };

  useEffect(() => {
    pickRandomRow();
  }, []);

  const currentRow = currentIndex !== null ? DATABASE_ROWS[currentIndex] : null;
  
  const getCorrectCharacterCount = () => {
    if (!currentRow) return 0;
    let count = 0;
    for (let i = 0; i < userInput.length && i < currentRow.hangul.length; i++) {
      if (userInput[i] === currentRow.hangul[i]) {
        count++;
      } else {
        break;
      }
    }
    return count;
  };

  const correctChars = getCorrectCharacterCount();
  const isFullyCorrect = currentRow && userInput === currentRow.hangul;

  useEffect(() => {
    if (isFullyCorrect && !showAnswer) {
      // Remove from incorrect indices if it was there
      if (currentIndex !== null && incorrectIndices.has(currentIndex)) {
        setIncorrectIndices(prev => {
          const next = new Set(prev);
          next.delete(currentIndex);
          return next;
        });
      }
    }
  }, [isFullyCorrect, showAnswer, currentIndex, incorrectIndices]);

  const handleGiveUp = () => {
    setShowAnswer(true);
    // Mark as incorrect
    if (currentIndex !== null) {
      setIncorrectIndices(prev => new Set(prev).add(currentIndex));
    }
  };

  const handleNext = () => {
    pickRandomRow();
  };

  if (!currentRow) {
    return <div>Loading...</div>;
  }

  return (
    <div className="quiz-container" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '2rem' }}>Hangul Quiz</h1>
      
      <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
        <h2 style={{ fontSize: '2rem' }}>
          {currentRow.url ? (
            <a href={currentRow.url} target="_blank" rel="noopener noreferrer">
              {currentRow.name}
            </a>
          ) : (
            currentRow.name
          )}
        </h2>
      </div>

      {!showAnswer && !isFullyCorrect && (
        <>
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            placeholder="Enter Hangul"
            style={{
              width: '100%',
              padding: '1rem',
              fontSize: '1.5rem',
              marginBottom: '1rem',
              boxSizing: 'border-box'
            }}
            autoFocus
          />
          
          <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
            Correct characters: {correctChars} / {currentRow.hangul.length}
          </div>
          
          <button
            onClick={handleGiveUp}
            style={{
              width: '100%',
              padding: '0.75rem',
              fontSize: '1.2rem',
              cursor: 'pointer'
            }}
          >
            Give up
          </button>
        </>
      )}

      {(showAnswer || isFullyCorrect) && (
        <div style={{ textAlign: 'center' }}>
          {showAnswer && (
            <div style={{ marginBottom: '1rem' }}>
              <h3>Answer:</h3>
              <p style={{ fontSize: '2rem' }}>{currentRow.hangul}</p>
            </div>
          )}
          
          {isFullyCorrect && !showAnswer && (
            <div style={{ marginBottom: '1rem', color: 'green' }}>
              <h3>Correct! 🎉</h3>
              <p style={{ fontSize: '2rem' }}>{currentRow.hangul}</p>
            </div>
          )}
          
          <button
            onClick={handleNext}
            style={{
              padding: '0.75rem 2rem',
              fontSize: '1.2rem',
              cursor: 'pointer'
            }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default App
