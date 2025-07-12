# useReducer Refactoring Plan for App.tsx

## Current State Analysis

The App component currently uses 5 separate useState hooks:

1. `currentQuestion`: DatabaseRow | null - The current quiz question
2. `userInput`: string - The user's typed answer
3. `answeredQuestions`: Set<string> - Set of question IDs that have been answered
4. `incorrectQuestions`: Set<string> - Set of question IDs answered incorrectly
5. `showAnswer`: boolean - Whether to display the correct answer

## Proposed State Data Model

```typescript
interface QuizState {
  currentQuestion: DatabaseRow | null;
  userInput: string;
  answeredQuestions: Set<string>;
  incorrectQuestions: Set<string>;
  showAnswer: boolean;
}

const initialState: QuizState = {
  currentQuestion: null,
  userInput: "",
  answeredQuestions: new Set(),
  incorrectQuestions: new Set(),
  showAnswer: false,
};
```

## Reducer Actions

```typescript
type QuizAction =
  | { type: "SET_QUESTION"; payload: DatabaseRow }
  | { type: "UPDATE_INPUT"; payload: string }
  | { type: "MARK_CORRECT"; payload: string } // questionId
  | { type: "MARK_INCORRECT"; payload: string } // questionId
  | { type: "SHOW_ANSWER" }
  | { type: "NEXT_QUESTION"; payload: DatabaseRow }
  | { type: "RESET_FOR_NEXT" };
```

### Action Descriptions

1. **SET_QUESTION**: Sets the current question (used for initialization)
2. **UPDATE_INPUT**: Updates the user's input text
3. **MARK_CORRECT**: Marks a question as answered correctly (removes from incorrect set if present)
4. **MARK_INCORRECT**: Marks a question as answered incorrectly
5. **SHOW_ANSWER**: Sets showAnswer to true (when user gives up)
6. **NEXT_QUESTION**: Transitions to next question (combines multiple state updates)
7. **RESET_FOR_NEXT**: Clears input and hides answer for next question

## Reducer Implementation Strategy

```typescript
function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "SET_QUESTION":
      return { ...state, currentQuestion: action.payload };

    case "UPDATE_INPUT":
      return { ...state, userInput: action.payload };

    case "MARK_CORRECT":
      return {
        ...state,
        answeredQuestions: new Set(state.answeredQuestions).add(action.payload),
        incorrectQuestions: new Set(
          [...state.incorrectQuestions].filter((id) => id !== action.payload),
        ),
      };

    case "MARK_INCORRECT":
      return {
        ...state,
        answeredQuestions: new Set(state.answeredQuestions).add(action.payload),
        incorrectQuestions: new Set(state.incorrectQuestions).add(
          action.payload,
        ),
      };

    case "SHOW_ANSWER":
      return { ...state, showAnswer: true };

    case "NEXT_QUESTION":
      return {
        ...state,
        currentQuestion: action.payload,
        userInput: "",
        showAnswer: false,
      };

    case "RESET_FOR_NEXT":
      return {
        ...state,
        userInput: "",
        showAnswer: false,
      };

    default:
      return state;
  }
}
```

## Testing Strategy

### 1. Unit Tests for Reducer

Create `quizReducer.test.ts` with tests for:

- Each action type
- State immutability
- Edge cases (null questions, empty sets)
- Complex scenarios (marking correct after incorrect)

### 2. Integration Tests

Update `App.test.tsx` to ensure:

- All existing functionality works with useReducer
- State transitions happen correctly
- UI updates properly based on state changes

### 3. Test Cases to Cover

#### Reducer Unit Tests:

- Initial state
- SET_QUESTION action
- UPDATE_INPUT action
- MARK_CORRECT action (new question)
- MARK_CORRECT action (previously incorrect question)
- MARK_INCORRECT action
- SHOW_ANSWER action
- NEXT_QUESTION action
- RESET_FOR_NEXT action
- Invalid action type (should return current state)

#### Integration Tests:

- Answering correctly updates state properly
- Giving up marks question as incorrect
- Next button resets appropriate state
- Question selection prioritizes unanswered/incorrect

## Implementation Steps

1. Create `quizReducer.ts` with types and reducer function
2. Create `quizReducer.test.ts` with comprehensive unit tests
3. Update `App.tsx` to use useReducer
4. Update event handlers to dispatch actions
5. Run existing tests to ensure no regression
6. Add any additional integration tests if needed

## Benefits of This Refactoring

1. **Centralized State Logic**: All state updates in one place
2. **Predictable State Updates**: Clear action types make state changes explicit
3. **Easier Testing**: Reducer can be tested in isolation
4. **Better Debugging**: Can log actions to trace state changes
5. **Scalability**: Easier to add new features/state in the future
