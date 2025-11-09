import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import HamburgerMenu from "./HamburgerMenu";
import type { AppCard } from "./AppCard";
import { createTestAppCard } from "./test/testHelpers";
import type { ComponentProps } from "react";

describe("HamburgerMenu", () => {
  const mockWords: AppCard[] = [
    createTestAppCard({ id: "test-id-1", name: "hello", hangul: "안녕" }),
    createTestAppCard({
      id: "test-id-2",
      name: "goodbye",
      hangul: "안녕히",
    }),
  ];

  const mockOnSelectWord = vi.fn();
  const mockOnSetMode = vi.fn();
  const mockOnSelectCategory = vi.fn();
  const mockOnSetMaxQuestions = vi.fn();
  const mockOnSetDifficulty = vi.fn();
  const mockOnSetAutoAdvance = vi.fn();

  const defaultProps: ComponentProps<typeof HamburgerMenu> = {
    words: mockWords,
    allQuestions: mockWords,
    currentCategory: undefined,
    currentMaxQuestions: undefined,
    currentDifficulty: "medium",
    autoAdvance: false,
    onSelectWord: mockOnSelectWord,
    onSelectCategory: mockOnSelectCategory,
    onSetMaxQuestions: mockOnSetMaxQuestions,
    onSetDifficulty: mockOnSetDifficulty,
    onSetAutoAdvance: mockOnSetAutoAdvance,
    mode: "translate",
    onSetMode: mockOnSetMode,
    currentQuestionId: "test-id-1",
  };

  const renderHamburgerMenu = (
    props: Partial<ComponentProps<typeof HamburgerMenu>> = {},
  ) => {
    return render(<HamburgerMenu {...defaultProps} {...props} />);
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render hamburger button", () => {
    renderHamburgerMenu();
    expect(screen.getByLabelText("Toggle menu")).toBeInTheDocument();
  });

  it("should show menu when hamburger button is clicked", () => {
    renderHamburgerMenu();

    const hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    expect(screen.getByText("About")).toBeInTheDocument();
    expect(screen.getByText("Choose category…")).toBeInTheDocument();
    expect(screen.getByText("Choose word…")).toBeInTheDocument();
    expect(screen.getByText("✓ Translate mode")).toBeInTheDocument();
    expect(screen.getByText("Typing tutor mode")).toBeInTheDocument();
  });

  it("should show checkmark next to active mode", () => {
    const { rerender } = renderHamburgerMenu();

    let hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    expect(screen.getByText("✓ Translate mode")).toBeInTheDocument();
    expect(screen.getByText("Typing tutor mode")).toBeInTheDocument();
    expect(screen.queryByText("✓ Typing tutor mode")).not.toBeInTheDocument();

    // Close menu and rerender with typingtutor mode
    fireEvent.click(hamburgerButton);

    rerender(<HamburgerMenu {...defaultProps} mode="typingtutor" />);

    hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    expect(screen.getByText("✓ Typing tutor mode")).toBeInTheDocument();
    expect(screen.getByText("Translate mode")).toBeInTheDocument();
    expect(screen.queryByText("✓ Translate mode")).not.toBeInTheDocument();
  });

  it("should call onSetMode with 'translate' when Translate mode is clicked", () => {
    renderHamburgerMenu({ mode: "typingtutor" });

    const hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    const translateButton = screen.getByText("Translate mode");
    fireEvent.click(translateButton);

    expect(mockOnSetMode).toHaveBeenCalledTimes(1);
    expect(mockOnSetMode).toHaveBeenCalledWith("translate");
  });

  it("should call onSetMode with 'typingtutor' when Typing tutor mode is clicked", () => {
    renderHamburgerMenu();

    const hamburgerButton = screen.getByLabelText("Toggle menu");
    fireEvent.click(hamburgerButton);

    const typingTutorButton = screen.getByText("Typing tutor mode");
    fireEvent.click(typingTutorButton);

    expect(mockOnSetMode).toHaveBeenCalledTimes(1);
    expect(mockOnSetMode).toHaveBeenCalledWith("typingtutor");
  });

  it("should close menu after clicking either mode button", () => {
    renderHamburgerMenu();

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
