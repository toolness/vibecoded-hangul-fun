# Hangul Quiz Implementation Plan

## Overview

Implementation plan for resolving TODOs in src/App.tsx to create a Hangul learning quiz application.

## Tasks

### 1. State Management Setup (High Priority)

Create React state to track:

- Current question/database row being displayed
- User's input for the current question
- Set of answered question IDs
- Set of incorrect question IDs
- Whether the current answer is revealed (give up state)

### 2. Question Selection Logic (High Priority)

Implement function to:

- Filter DATABASE_ROWS to find unanswered or previously incorrect entries
- Randomly select one entry from the filtered set
- Handle edge case when all questions have been answered correctly

### 3. Display Components (Medium Priority)

Build UI components for:

- Displaying the English/romanized name
  - If URL exists, make it a hyperlink that opens in new window
- Large text input field for Hangul entry
- Character accuracy feedback (e.g., "3/5 characters correct")
- "Give up" button below the input field

### 4. User Interaction Handlers (High Priority)

Implement handlers for:

- Real-time input validation as user types
  - Compare user input with correct Hangul character by character
  - Update feedback display
  - Show "Next" button when fully correct
- "Give up" button click
  - Display the correct Hangul answer
  - Show "Next" button
- "Next" button click
  - Reset state for new question
  - Select and display new question

### 5. Answer Validation Logic (Medium Priority)

Create function to:

- Compare user input with correct answer
- Return number of correct characters
- Determine if answer is fully correct

### 6. UI Styling (Low Priority)

Style the components for better user experience:

- Center the quiz interface
- Make input field prominent
- Style buttons appropriately
- Add visual feedback for correct/incorrect states

## Implementation Notes

- The quiz cycles through DATABASE_ROWS, prioritizing questions the user hasn't seen or previously answered incorrectly
- User progress persists only during the current session (no localStorage/backend)
- The app provides immediate feedback on character accuracy to aid learning
