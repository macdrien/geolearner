"use client";

import type { ReactNode } from "react";
import styles from "../page.module.css";

export type SelectableOption<Value extends string> = {
  id: Value;
  title: string;
  detail: string;
  icon?: ReactNode;
  meta?: ReactNode;
};

type SelectableOptionGroupProps<Value extends string> = {
  options: SelectableOption<Value>[];
  selectedValue: Value;
  variant: "quiz" | "mode";
  onSelect: (value: Value) => void;
};

export default function SelectableOptionGroup<Value extends string>({
  options,
  selectedValue,
  variant,
  onSelect,
}: SelectableOptionGroupProps<Value>) {
  const isQuizGroup = variant === "quiz";

  return (
    <div className={isQuizGroup ? styles.questionnaireGrid : styles.modeOptions}>
      {options.map((option) => {
        const isSelected = selectedValue === option.id;
        const optionClass = isQuizGroup
          ? styles.questionnaireOption
          : styles.modeOption;
        const selectedClass = isQuizGroup
          ? styles.optionSelected
          : styles.modeSelected;

        return (
          <button
            aria-pressed={isSelected}
            className={`${optionClass} ${isSelected ? selectedClass : ""}`}
            key={option.id}
            onClick={() => onSelect(option.id)}
            type="button"
          >
            {isQuizGroup ? (
              <span className={styles.questionnaireIcon} aria-hidden="true">
                {option.icon}
              </span>
            ) : (
              <span className={styles.radioMark} aria-hidden="true" />
            )}
            <span className={isQuizGroup ? styles.optionText : undefined}>
              <strong>{option.title}</strong>
              {isQuizGroup ? (
                <span>{option.detail}</span>
              ) : (
                <small>{option.detail}</small>
              )}
            </span>
            {isQuizGroup && option.meta !== undefined && (
              <span className={styles.questionCount}>{option.meta}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
