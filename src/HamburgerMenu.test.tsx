import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HamburgerMenu from "./HamburgerMenu";
import type { DatabaseRow } from "./database-spec";

describe("HamburgerMenu", () => {
  const mockWords: DatabaseRow[] = [
    { name: "hello", hangul: "안녕", url: "" },
    { name: "goodbye", hangul: "안녕히", url: "" },
  ];

  const mockOnSelectWord = vi.fn();
  const mockOnToggleTypingTutorMode = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render hamburger button", () => {
    render(
      <HamburgerMenu
        words={mockWords}
        onSelectWord={mockOnSelectWord}
        isTypingTutorMode={false}
        onToggleTypingTutorMode={mockOnToggleTypingTutorMode}
      />,
    );
    expect(screen.getByLabelText("Toggle menu")).toBeInTheDocument();
  });

  it("should show menu when hamburger button is clicked", () => {
    render(
      <HamburgerMenu
        words={mockWords}
        onSelectWord={mockOnSelectWord}
        isTypingTutorMode={false}
        onToggleTypingTutorMode={mockOnToggleTypingTutorMode}
      />,
    );

    const hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Choose word…")).toBeInTheDocument();
    expect(screen.getByText("Typing tutor mode")).toBeInTheDocument();
  });

  it("should show checkmark when typing tutor mode is active", () => {
    render(
      <HamburgerMenu
        words={mockWords}
        onSelectWord={mockOnSelectWord}
        isTypingTutorMode={true}
        onToggleTypingTutorMode={mockOnToggleTypingTutorMode}
      />,
    );

    const hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    expect(screen.getByText("✓ Typing tutor mode")).toBeInTheDocument();
  });

  it("should not show checkmark when typing tutor mode is inactive", () => {
    render(
      <HamburgerMenu
        words={mockWords}
        onSelectWord={mockOnSelectWord}
        isTypingTutorMode={false}
        onToggleTypingTutorMode={mockOnToggleTypingTutorMode}
      />,
    );

    const hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    const typingTutorButton = screen.getByText("Typing tutor mode");
    expect(typingTutorButton.textContent).toBe("Typing tutor mode");
    expect(typingTutorButton.textContent).not.toContain("✓");
  });

  it("should call onToggleTypingTutorMode when typing tutor mode is clicked", () => {
    render(
      <HamburgerMenu
        words={mockWords}
        onSelectWord={mockOnSelectWord}
        isTypingTutorMode={false}
        onToggleTypingTutorMode={mockOnToggleTypingTutorMode}
      />,
    );

    const hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    const typingTutorButton = screen.getByText("Typing tutor mode");
    fireEvent.click(typingTutorButton);

    expect(mockOnToggleTypingTutorMode).toHaveBeenCalledTimes(1);
  });

  it("should close menu after clicking typing tutor mode", () => {
    render(
      <HamburgerMenu
        words={mockWords}
        onSelectWord={mockOnSelectWord}
        isTypingTutorMode={false}
        onToggleTypingTutorMode={mockOnToggleTypingTutorMode}
      />,
    );

    const hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    expect(screen.getByText("Typing tutor mode")).toBeInTheDocument();

    const typingTutorButton = screen.getByText("Typing tutor mode");
    fireEvent.click(typingTutorButton);

    // Menu should close after clicking typing tutor mode
    expect(screen.queryByText("Typing tutor mode")).not.toBeInTheDocument();
  });
});
