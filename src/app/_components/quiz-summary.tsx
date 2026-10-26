import type { QuizCategoryId, QuizFormatId } from "@/lib/quiz-engine";
import { quizCategories } from "@/lib/quiz-engine";
import {
  quizFormats,
  quizModes,
  type QuizModeId,
} from "./quiz-options";
import styles from "../page.module.css";

export default function QuizSummary({
  category,
  format,
  mode,
  questionCount,
}: {
  category: QuizCategoryId;
  format: QuizFormatId;
  mode: QuizModeId;
  questionCount: number;
}) {
  const selectedCategory = quizCategories.find(
    (option) => option.id === category,
  );
  const selectedMode = quizModes.find((option) => option.id === mode);
  const selectedFormat = quizFormats.find((option) => option.id === format);

  return (
    <aside className={styles.summaryCard} aria-labelledby="summary-title">
      <div className={styles.summaryTop}>
        <p className={styles.eyebrow}>Ta prochaine aventure</p>
        <span className={styles.compassIcon} aria-hidden="true">
          ✳
        </span>
      </div>
      <h2 id="summary-title">{selectedCategory?.title}</h2>
      <p className={styles.summaryText}>{selectedCategory?.detail}</p>
      <div className={styles.summaryDivider} />
      <div className={styles.summaryMeta}>
        <span>Type de quiz</span>
        <strong>{selectedFormat?.title}</strong>
      </div>
      <div className={styles.summaryMeta}>
        <span>Rythme</span>
        <strong>{selectedMode?.title}</strong>
      </div>
      <div className={styles.summaryMeta}>
        <span>Questions</span>
        <strong>{questionCount}</strong>
      </div>
      <div className={styles.mapPattern} aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
        <span />
      </div>
      <p className={styles.summaryFootnote}>
        Une fois lancé, le quiz se déroule entièrement sur cet appareil.
      </p>
    </aside>
  );
}
