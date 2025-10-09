import type { FillInTheBlankItem } from "./AppCard";

export function FillInTheBlank(props: {
  items: FillInTheBlankItem[];
  showAnswer: boolean;
}) {
  const { items, showAnswer } = props;

  return (
    <span
      className={`fill-in-the-blank ${showAnswer ? "show-answer" : "hide-answer"}`}
    >
      {items.map((item, i) => {
        if (item.type === "content") {
          return (
            <span key={i} className="content">
              {item.value}
            </span>
          );
        }
        return (
          <span key={i} className="blank">
            {showAnswer ? item.answer : item.blankValue}
          </span>
        );
      })}
    </span>
  );
}
