import { useMemo } from "react";
import Select from "react-select";
import type { SingleValue } from "react-select";
import "./WordSelectionModal.css";
import type { DatabaseRow } from "./database-spec";
import Modal from "./Modal";

interface WordOption {
  value: string;
  label: string;
  data: DatabaseRow;
}

interface WordSelectionModalProps {
  words: DatabaseRow[];
  onSelectWord: (word: DatabaseRow) => void;
  onClose: () => void;
  previousFocus?: HTMLElement | null;
}

function WordSelectionModal({
  words,
  onSelectWord,
  onClose,
  previousFocus,
}: WordSelectionModalProps) {
  // Convert words to React-Select options and sort alphabetically
  const options = useMemo(
    () =>
      [...words]
        .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
        .map((word) => ({
          // For now we'll include the hangul as part of the value that's searched.
          //
          // Note that that this will search for whole syllables rather than
          // individual jamos; we could potentially change this by doing custom
          // filtering: https://react-select.com/advanced#custom-filter-logic
          value: (word.name || "") + (word.hangul ?? ""),
          label: word.name || "",
          data: word,
        })),
    [words],
  );

  const handleChange = (newValue: SingleValue<WordOption>) => {
    if (newValue) {
      // Immediately select and close when a word is chosen
      onSelectWord(newValue.data);
      onClose();
    }
  };

  return (
    <Modal
      title="Choose a word"
      onClose={onClose}
      previousFocus={previousFocus}
    >
      <Select
        className="word-select"
        classNamePrefix="word-select"
        value={null}
        onChange={handleChange}
        options={options}
        placeholder="Search for a word..."
        isClearable={false}
        isSearchable={true}
        autoFocus={true}
        menuIsOpen={true}
        styles={{
          control: (base) => ({
            ...base,
            minHeight: "40px",
          }),
          menu: (base) => ({
            ...base,
            position: "relative",
            marginTop: "0",
            marginBottom: "8px",
          }),
          menuList: (base) => ({
            ...base,
            maxHeight: "300px",
          }),
        }}
      />
    </Modal>
  );
}

export default WordSelectionModal;
