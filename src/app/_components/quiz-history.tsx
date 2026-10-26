"use client";

import type { CompletedQuiz } from "@/lib/quiz-history";
import styles from "../page.module.css";

type QuizHistoryProps = {
  entries: CompletedQuiz[];
  isLoaded: boolean;
  hasError: boolean;
};

export default function QuizHistory({
  entries,
  isLoaded,
  hasError,
}: QuizHistoryProps) {
  return (
    <section className={styles.historySection} aria-labelledby="history-title">
      <div className={styles.historyHeading}>
        <div>
          <p className={styles.eyebrow}>Tes dernières découvertes</p>
          <h2 id="history-title">Mon historique</h2>
        </div>
        <span className={styles.historyCount}>
          {entries.length} test{entries.length === 1 ? "" : "s"}
        </span>
      </div>
      {hasError ? (
        <p className={styles.historyEmpty} role="alert">
          Impossible de lire l’historique enregistré sur cet appareil.
        </p>
      ) : !isLoaded ? (
        <p className={styles.historyEmpty}>Chargement de ton historique…</p>
      ) : entries.length === 0 ? (
        <div className={styles.historyEmpty}>
          <span className={styles.historyEmptyIcon} aria-hidden="true">
            ◎
          </span>
          <div>
            <strong>Ton carnet est encore tout neuf.</strong>
            <p>Les tests que tu termineras apparaîtront ici.</p>
          </div>
        </div>
      ) : (
        <ol className={styles.historyList}>
          {entries.map((entry) => (
            <li className={styles.historyEntry} key={entry.id}>
              <span className={styles.historyEntryIcon} aria-hidden="true">
                ◎
              </span>
              <span className={styles.historyEntryText}>
                <strong>{entry.questionnaire}</strong>
                <small>
                  {entry.mode} ·{" "}
                  {new Date(entry.completedAt).toLocaleDateString("fr-FR")}
                </small>
              </span>
              {entry.score && (
                <span className={styles.historyScore}>{entry.score}</span>
              )}
            </li>
          ))}
        </ol>
      )}
      <p className={styles.historyStorageNote}>
        Ton historique est conservé sur cet appareil.
      </p>
    </section>
  );
}
