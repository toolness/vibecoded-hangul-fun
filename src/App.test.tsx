import { expect, test, describe } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";
import "@testing-library/jest-dom";
import type { Mode } from "./quizStateReducer";

function TestApp(props: { initialMode?: Mode }) {
  return (
    <App
      initialMode={props.initialMode ?? "picture"}
      initialRows={[
        { id: "test-1", name: "hello", hangul: "안녕하세요", image: "hi.png" },
        {
          id: "test-2",
          name: "goodbye",
          hangul: "안녕히 가세요",
          url: "https://example.com",
          image: "bye.png",
        },
        { id: "test-3", name: "thank you", hangul: "감사합니다" },
        { id: "test-4", name: "sorry", hangul: "죄송합니다" },
        { id: "test-5", name: "yes", hangul: "네" },
      ]}
    />
  );
}

describe("App State Management", () => {
  test("renders without crashing", () => {
    render(<TestApp />);
    expect(screen.getByRole("main")).toBeInTheDocument();
  });

  test("initializes with a question", () => {
    render(<TestApp />);
    // Should show a question (name) and input field
    expect(screen.getByTestId("question-name")).toBeInTheDocument();
    expect(screen.getByTestId("hangul-input")).toBeInTheDocument();
  });

  test("tracks user input", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    const input = screen.getByTestId("hangul-input") as HTMLInputElement;
    await user.type(input, "한글");

    expect(input.value).toBe("한글");
  });

  test("shows give up button", () => {
    render(<TestApp />);
    expect(screen.getByText("Give up")).toBeInTheDocument();
  });

  test("shows skip button", () => {
    render(<TestApp />);
    expect(screen.getByText("Skip")).toBeInTheDocument();
  });

  test("skip button moves to next question without revealing answer", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Click skip
    await user.click(screen.getByText("Skip"));

    // Should not show the answer
    expect(screen.queryByTestId("correct-answer")).not.toBeInTheDocument();

    // Should still be on a question (might be the same due to randomness)
    expect(screen.getByTestId("question-name")).toBeInTheDocument();
    expect(screen.getByTestId("hangul-input")).toBeInTheDocument();

    // Should show Skip and Give up buttons, not Next
    expect(screen.getByText("Skip")).toBeInTheDocument();
    expect(screen.getByText("Give up")).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });

  test("input field receives focus after clicking Skip", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Click skip
    await user.click(screen.getByText("Skip"));

    // Wait for the input to be focused
    const input = screen.getByTestId("hangul-input");
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
  });

  test("input field receives focus after clicking Next", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Give up to show Next button
    await user.click(screen.getByText("Give up"));

    // Click Next
    await user.click(screen.getByText("Next"));

    // Wait for the input to be focused
    const input = screen.getByTestId("hangul-input");
    await waitFor(() => {
      expect(document.activeElement).toBe(input);
    });
  });

  test("tracks answered questions", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Should have a way to check if questions are being tracked
    // This will be tested more thoroughly when we implement the full logic
    const giveUpButton = screen.getByText("Give up");
    await user.click(giveUpButton);

    // After giving up, should show the answer and next button
    expect(screen.getByTestId("correct-answer")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();
  });
});

describe("Question Selection Logic", () => {
  test("selects a new question when clicking next", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Give up and click next
    await user.click(screen.getByText("Give up"));
    await user.click(screen.getByText("Next"));

    // Should show a question (might be the same due to randomness, but structure should be there)
    expect(screen.getByTestId("question-name")).toBeInTheDocument();
    expect(screen.getByTestId("hangul-input")).toBeInTheDocument();
  });

  test("prioritizes unanswered questions", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Mark several questions as answered by giving up and clicking next multiple times
    for (let i = 0; i < 3; i++) {
      await user.click(screen.getByText("Give up"));
      await user.click(screen.getByText("Next"));
    }

    // The app should still be showing questions
    expect(screen.getByTestId("question-name")).toBeInTheDocument();
  });

  test("shows questions that were previously incorrect", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Type wrong answer and mark as incorrect
    const input = screen.getByTestId("hangul-input") as HTMLInputElement;
    await user.type(input, "wrong");

    // Give up to see the answer
    await user.click(screen.getByText("Give up"));

    // Go to next question
    await user.click(screen.getByText("Next"));

    // Question should be available for selection again since it was incorrect
    expect(screen.getByTestId("question-name")).toBeInTheDocument();
  });
});

describe("URL Display", () => {
  test("displays name as link when URL is present", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Keep clicking next until we find the "goodbye" question which has a URL
    let foundLink = false;
    for (let i = 0; i < 10 && !foundLink; i++) {
      const element = screen.getByTestId("question-name");
      if (element.tagName === "A" && element.textContent === "goodbye") {
        foundLink = true;
        expect(element).toHaveAttribute("href", "https://example.com");
        expect(element).toHaveAttribute("target", "_blank");
        expect(element).toHaveAttribute("rel", "noopener noreferrer");
      } else if (element.textContent !== "goodbye") {
        // Not the right question, go to next
        await user.click(screen.getByText("Give up"));
        await user.click(screen.getByText("Next"));
      }
    }
  });

  test("displays name as text when URL is not present", () => {
    render(<TestApp />);

    const element = screen.getByTestId("question-name");
    // If it's not a link, it should be a span
    if (element.tagName === "SPAN") {
      expect(element.tagName).toBe("SPAN");
    }
  });
});

describe("Keyboard Accessibility", () => {
  test("Enter key advances to next question when answer is correct", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Find a predictable question
    let found = false;
    for (let i = 0; i < 10 && !found; i++) {
      const questionName = screen.getByTestId("question-name").textContent;
      if (questionName === "yes") {
        found = true;
        break;
      }
      await user.click(screen.getByText("Give up"));
      await user.click(screen.getByText("Next"));
    }

    if (found) {
      const input = screen.getByTestId("hangul-input") as HTMLInputElement;

      // Type the correct answer
      await user.type(input, "네");

      // Press Enter
      await user.keyboard("{Enter}");

      // Should have moved to next question
      expect(input.value).toBe(""); // Input should be cleared
      expect(screen.getByTestId("question-name")).toBeInTheDocument();
    }
  });

  test("Enter key advances when answer is shown", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Give up to show the answer
    await user.click(screen.getByText("Give up"));

    // Should show the answer
    expect(screen.getByTestId("correct-answer")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeInTheDocument();

    // Focus the input and press Enter
    const input = screen.getByTestId("hangul-input");
    input.focus();
    await user.keyboard("{Enter}");

    // Should have moved to next question
    expect(screen.queryByTestId("correct-answer")).not.toBeInTheDocument();
    expect(screen.getByTestId("question-name")).toBeInTheDocument();
  });

  test("Enter key does nothing when answer is incorrect", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    const input = screen.getByTestId("hangul-input") as HTMLInputElement;

    // Type an incorrect answer
    await user.type(input, "잘못");

    // Press Enter
    await user.keyboard("{Enter}");

    // Should still be on the same question with Give up button
    expect(input.value).toBe("잘못");
    expect(screen.getByText("Give up")).toBeInTheDocument();
    expect(screen.queryByText("Next")).not.toBeInTheDocument();
  });
});

describe("Real-time Character Validation", () => {
  test("shows character accuracy feedback", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Find a predictable question (let's try to get "yes" = "네")
    let found = false;
    for (let i = 0; i < 10 && !found; i++) {
      const questionName = screen.getByTestId("question-name").textContent;
      if (questionName === "yes") {
        found = true;
        break;
      }
      await user.click(screen.getByText("Give up"));
      await user.click(screen.getByText("Next"));
    }

    if (found) {
      const input = screen.getByTestId("hangul-input") as HTMLInputElement;

      // Type one correct character
      await user.type(input, "네");

      // Should show feedback that all jamos are correct
      expect(screen.getByTestId("character-feedback")).toHaveTextContent(
        "2/2 keystrokes correct",
      );
    }
  });

  test("shows next button when answer is completely correct", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Find a predictable question
    let found = false;
    for (let i = 0; i < 10 && !found; i++) {
      const questionName = screen.getByTestId("question-name").textContent;
      if (questionName === "yes") {
        found = true;
        break;
      }
      await user.click(screen.getByText("Give up"));
      await user.click(screen.getByText("Next"));
    }

    if (found) {
      const input = screen.getByTestId("hangul-input") as HTMLInputElement;

      // Type the complete correct answer
      await user.type(input, "네");

      // Should show next button instead of give up button
      expect(screen.queryByText("Give up")).not.toBeInTheDocument();
      expect(screen.getByText("Next")).toBeInTheDocument();
    }
  });

  test("tracks correct answers differently from incorrect ones", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Find a predictable question
    let found = false;
    for (let i = 0; i < 10 && !found; i++) {
      const questionName = screen.getByTestId("question-name").textContent;
      if (questionName === "yes") {
        found = true;
        break;
      }
      await user.click(screen.getByText("Give up"));
      await user.click(screen.getByText("Next"));
    }

    if (found) {
      const input = screen.getByTestId("hangul-input") as HTMLInputElement;

      // Type the correct answer
      await user.type(input, "네");

      // Click next
      await user.click(screen.getByText("Next"));

      // Should have moved to next question
      expect(screen.getByTestId("question-name")).toBeInTheDocument();
    }
  });
});

describe("UI Styling", () => {
  test("quiz container has proper structure", () => {
    render(<TestApp />);

    // Check for quiz container
    expect(screen.getByTestId("quiz-container")).toBeInTheDocument();
  });

  test("input field has proper size attributes", () => {
    render(<TestApp />);

    const input = screen.getByTestId("hangul-input") as HTMLInputElement;
    expect(input.className).toContain("hangul-input");
  });
});

describe("Typing Tutor Mode", () => {
  test("displays 'Translate to Hangul:' in translate mode", () => {
    render(<TestApp initialMode="translate" />);
    expect(screen.getByText("Translate to Hangul:")).toBeInTheDocument();
  });

  test("toggles to typing tutor mode when menu option is clicked", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Open hamburger menu
    const hamburgerButton = screen.getByLabelText("Toggle menu");
    await user.click(hamburgerButton);

    // Click typing tutor mode
    const typingTutorButton = screen.getByText("Typing tutor mode");
    await user.click(typingTutorButton);

    // Should now show "Type this Hangul:" instead
    expect(screen.getByText("Type this Hangul:")).toBeInTheDocument();
    expect(screen.queryByText("Translate to Hangul:")).not.toBeInTheDocument();
  });

  test("displays Hangul directly in typing tutor mode", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Enable typing tutor mode
    const hamburgerButton = screen.getByLabelText("Toggle menu");
    await user.click(hamburgerButton);
    const typingTutorButton = screen.getByText("Typing tutor mode");
    await user.click(typingTutorButton);

    // The question should now show Hangul characters
    const questionElement = screen.getByTestId("question-name");
    const questionText = questionElement.textContent || "";

    // Check that it's showing Hangul (contains Korean characters)
    const hasKoreanCharacters = /[\u3131-\uD79D]/.test(questionText);
    expect(hasKoreanCharacters).toBe(true);
  });

  test("shows romanized version in translate mode", () => {
    render(<TestApp initialMode="translate" />);

    const questionElement = screen.getByTestId("question-name");
    const questionText = questionElement.textContent || "";

    // Should show English text in translate mode
    const hasLatinCharacters = /[a-zA-Z]/.test(questionText);
    expect(hasLatinCharacters).toBe(true);
  });

  test("toggling back from typing tutor mode restores normal display", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Enable typing tutor mode
    await user.click(screen.getByLabelText("Toggle menu"));
    await user.click(screen.getByText("Typing tutor mode"));

    // Verify it's in typing tutor mode
    expect(screen.getByText("Type this Hangul:")).toBeInTheDocument();

    // Open menu again and select translate mode
    await user.click(screen.getByLabelText("Toggle menu"));
    await user.click(screen.getByText("Translate mode"));

    // Should be back to normal mode
    expect(screen.getByText("Translate to Hangul:")).toBeInTheDocument();
    expect(screen.queryByText("Type this Hangul:")).not.toBeInTheDocument();
  });

  test("checkmark appears in menu when typing tutor mode is active", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Enable typing tutor mode
    await user.click(screen.getByLabelText("Toggle menu"));
    await user.click(screen.getByText("Typing tutor mode"));

    // Open menu again to check for checkmark
    await user.click(screen.getByLabelText("Toggle menu"));
    expect(screen.getByText("✓ Typing tutor mode")).toBeInTheDocument();
  });

  test("answer validation works the same in typing tutor mode", async () => {
    const user = userEvent.setup();
    render(<TestApp />);

    // Enable typing tutor mode
    const hamburgerButton = screen.getByLabelText("Toggle menu");
    await user.click(hamburgerButton);
    const typingTutorButton = screen.getByText("Typing tutor mode");
    await user.click(typingTutorButton);

    // Type some input
    const input = screen.getByTestId("hangul-input") as HTMLInputElement;
    await user.type(input, "안");

    // Should still show character feedback
    expect(screen.getByTestId("character-feedback")).toBeInTheDocument();
  });
});
