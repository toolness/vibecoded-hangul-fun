import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HamburgerMenu from "./HamburgerMenu";
import type { DatabaseRow } from "./database-spec";
import { createTestDatabaseRow } from "./test/testHelpers";

describe("HamburgerMenu", () => {
  const mockWords: DatabaseRow[] = [
    createTestDatabaseRow({ id: "test-id-1", name: "hello", hangul: "안녕" }),
    createTestDatabaseRow({
      id: "test-id-2",
      name: "goodbye",
      hangul: "안녕히",
    }),
  ];

  const mockOnSelectWord = vi.fn();
  const mockOnSetMode = vi.fn();
  const mockOnSelectCategory = vi.fn();
  const mockOnSetMaxQuestions = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render hamburger button", () => {
    render(
      <HamburgerMenu
        words={mockWords}
        allQuestions={mockWords}
        currentCategory={undefined}
        currentMaxQuestions={undefined}
        onSelectWord={mockOnSelectWord}
        onSelectCategory={mockOnSelectCategory}
        onSetMaxQuestions={mockOnSetMaxQuestions}
        mode="translate"
        onSetMode={mockOnSetMode}
        currentQuestionId="test-id-1"
      />,
    );
    expect(screen.getByLabelText("Toggle menu")).toBeInTheDocument();
  });

  it("should show menu when hamburger button is clicked", () => {
    render(
      <HamburgerMenu
        words={mockWords}
        allQuestions={mockWords}
        currentCategory={undefined}
        currentMaxQuestions={undefined}
        onSelectWord={mockOnSelectWord}
        onSelectCategory={mockOnSelectCategory}
        onSetMaxQuestions={mockOnSetMaxQuestions}
        mode="translate"
        onSetMode={mockOnSetMode}
        currentQuestionId="test-id-1"
      />,
    );

    const hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Choose category…")).toBeInTheDocument();
    expect(screen.getByText("Choose word…")).toBeInTheDocument();
    expect(screen.getByText("✓ Translate mode")).toBeInTheDocument();
    expect(screen.getByText("Typing tutor mode")).toBeInTheDocument();
  });

  it("should show checkmark next to active mode", () => {
    const { rerender } = render(
      <HamburgerMenu
        words={mockWords}
        allQuestions={mockWords}
        currentCategory={undefined}
        currentMaxQuestions={undefined}
        onSelectWord={mockOnSelectWord}
        onSelectCategory={mockOnSelectCategory}
        onSetMaxQuestions={mockOnSetMaxQuestions}
        mode="translate"
        onSetMode={mockOnSetMode}
        currentQuestionId="test-id-1"
      />,
    );

    let hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    expect(screen.getByText("✓ Translate mode")).toBeInTheDocument();
    expect(screen.getByText("Typing tutor mode")).toBeInTheDocument();
    expect(screen.queryByText("✓ Typing tutor mode")).not.toBeInTheDocument();

    // Close menu and rerender with typingtutor mode
    fireEvent.click(hamburgerButton);

    rerender(
      <HamburgerMenu
        words={mockWords}
        allQuestions={mockWords}
        currentCategory={undefined}
        currentMaxQuestions={undefined}
        onSelectWord={mockOnSelectWord}
        onSelectCategory={mockOnSelectCategory}
        onSetMaxQuestions={mockOnSetMaxQuestions}
        mode="typingtutor"
        onSetMode={mockOnSetMode}
        currentQuestionId="test-id-1"
      />,
    );

    hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    expect(screen.getByText("✓ Typing tutor mode")).toBeInTheDocument();
    expect(screen.getByText("Translate mode")).toBeInTheDocument();
    expect(screen.queryByText("✓ Translate mode")).not.toBeInTheDocument();
  });

  it("should call onSetMode with 'translate' when Translate mode is clicked", () => {
    render(
      <HamburgerMenu
        words={mockWords}
        allQuestions={mockWords}
        currentCategory={undefined}
        currentMaxQuestions={undefined}
        onSelectWord={mockOnSelectWord}
        onSelectCategory={mockOnSelectCategory}
        onSetMaxQuestions={mockOnSetMaxQuestions}
        mode="typingtutor"
        onSetMode={mockOnSetMode}
        currentQuestionId="test-id-1"
      />,
    );

    const hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    const translateButton = screen.getByText("Translate mode");
    fireEvent.click(translateButton);

    expect(mockOnSetMode).toHaveBeenCalledTimes(1);
    expect(mockOnSetMode).toHaveBeenCalledWith("translate");
  });

  it("should call onSetMode with 'typingtutor' when Typing tutor mode is clicked", () => {
    render(
      <HamburgerMenu
        words={mockWords}
        allQuestions={mockWords}
        currentCategory={undefined}
        currentMaxQuestions={undefined}
        onSelectWord={mockOnSelectWord}
        onSelectCategory={mockOnSelectCategory}
        onSetMaxQuestions={mockOnSetMaxQuestions}
        mode="translate"
        onSetMode={mockOnSetMode}
        currentQuestionId="test-id-1"
      />,
    );

    const hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    const typingTutorButton = screen.getByText("Typing tutor mode");
    fireEvent.click(typingTutorButton);

    expect(mockOnSetMode).toHaveBeenCalledTimes(1);
    expect(mockOnSetMode).toHaveBeenCalledWith("typingtutor");
  });

  it("should close menu after clicking either mode button", () => {
    render(
      <HamburgerMenu
        words={mockWords}
        allQuestions={mockWords}
        currentCategory={undefined}
        currentMaxQuestions={undefined}
        onSelectWord={mockOnSelectWord}
        onSelectCategory={mockOnSelectCategory}
        onSetMaxQuestions={mockOnSetMaxQuestions}
        mode="translate"
        onSetMode={mockOnSetMode}
        currentQuestionId="test-id-1"
      />,
    );

    const hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    expect(screen.getByText("✓ Translate mode")).toBeInTheDocument();
    expect(screen.getByText("Typing tutor mode")).toBeInTheDocument();

    const translateButton = screen.getByText("✓ Translate mode");
    fireEvent.click(translateButton);

    // Menu should close after clicking translate mode
    expect(screen.queryByText("✓ Translate mode")).not.toBeInTheDocument();
    expect(screen.queryByText("Typing tutor mode")).not.toBeInTheDocument();
  });
});
