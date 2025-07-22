# Typing Tutor Mode Implementation Plan

## Overview
This document outlines the implementation plan for adding a "Typing tutor mode" feature to the Hangul learning application. This mode will allow users to practice typing Hangul characters directly without needing to de-romanize words.

## Feature Requirements
- Add "Typing tutor mode" option to hamburger menu
- When enabled:
  - Change header from "Translate to Hangul" to "Type this Hangul"
  - Display only the Hangul version of the word (hide romanized version)
  - Show checkmark next to menu item when active
- Toggle functionality to enable/disable the mode

## Implementation Steps

### 1. Update State Management (quizStateReducer.ts)
- Add `isTypingTutorMode: boolean` to the `QuizState` interface
- Create new action type: `TOGGLE_TYPING_TUTOR_MODE`
- Update reducer to handle the toggle action

### 2. Modify Hamburger Menu (HamburgerMenu.tsx)
- Add new menu item: "Typing tutor mode"
- Implement click handler to dispatch toggle action
- Add checkmark display logic when mode is active
- Pass `isTypingTutorMode` prop from App.tsx

### 3. Update Main UI (App.tsx)
- Pass `isTypingTutorMode` from state to HamburgerMenu component
- Conditionally render UI elements based on mode:
  - Header text: "Type this Hangul" vs "Translate to Hangul"
  - Question display: Show Hangul directly vs romanized version
- Ensure answer logic remains the same

### 4. Styling Updates
- Ensure consistent styling for the new menu item
- Add checkmark icon styling if needed

## Technical Details

### State Changes
```typescript
// Add to QuizState interface
interface QuizState {
  // ... existing fields
  isTypingTutorMode: boolean;
}

// New action type
type QuizAction = 
  | // ... existing actions
  | { type: 'TOGGLE_TYPING_TUTOR_MODE' };
```

### UI Conditional Rendering
```typescript
// App.tsx
<h2 className="question-prompt">
  {state.isTypingTutorMode ? "Type this Hangul:" : "Translate to Hangul:"}
</h2>

// Question display
{state.isTypingTutorMode ? (
  <span className="question-name hangul">
    {state.currentQuestion.hangul}
  </span>
) : (
  <span className="question-name">
    {state.currentQuestion.name}
  </span>
)}
```

### Menu Item Addition
```typescript
// HamburgerMenu.tsx
<button className="menu-link" onClick={handleToggleTypingTutorMode}>
  {isTypingTutorMode && "✓ "}Typing tutor mode
</button>
```

## Testing Plan
1. Verify menu item appears and functions correctly
2. Ensure UI changes when mode is toggled
3. Confirm checkmark appears/disappears appropriately
4. Test that answer validation still works correctly
5. Verify no regression in existing functionality

## Files to Modify
1. `src/quizStateReducer.ts` - State management updates
2. `src/HamburgerMenu.tsx` - Add menu item and handler
3. `src/App.tsx` - Conditional UI rendering
4. Potentially `src/App.css` - Any styling adjustments needed

## Considerations
- The typing experience should remain the same, only the display changes
- Answer validation logic remains unchanged
- The speaker button should still work in typing tutor mode
- All other menu options should continue to function normally