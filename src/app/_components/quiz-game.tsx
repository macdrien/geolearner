"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  normalizeQuizAnswer,
  type QuizCategoryId,
  type QuizFormatId,
  type QuizQuestion,
} from "@/lib/quiz-engine";
import DashboardHeader from "./dashboard-header";
import QuizMap from "./quiz-map";
import type { QuizSessionState } from "./use-quiz-session";
import styles from "../page.module.css";

type QuizGameProps = {
  title: string;
  category: QuizCategoryId;
  state: Exclude<QuizSessionState, { status: "idle" }>;
  onAnswer: (answer: string) => void;
  onNext: () => void;
  onSubmitList: (answers: string[]) => void;
  onLeave: () => void;
};

function QuizResult({
  score,
  total,
  error,
  onLeave,
}: {
  score: number;
  total: number;
  error: string | null;
  onLeave: () => void;
}) {
  return (
    <div className={styles.quizResult} role="status">
      <strong>
        Ton score : {score} / {total}
      </strong>
      <p>Le résultat est conservé uniquement sur cet appareil.</p>
      {error && (
        <p className={styles.quizError} role="alert">
          {error}
        </p>
      )}
      <button
        className={styles.startQuizButton}
        type="button"
        onClick={onLeave}
      >
        Choisir un autre quiz
      </button>
    </div>
  );
}

function QuizListView({
  questions,
  answers,
  onSubmit,
}: {
  questions: QuizQuestion[];
  answers: string[] | null;
  onSubmit: (answers: string[]) => void;
}) {
  const [enteredAnswers, setEnteredAnswers] = useState<string[]>(() =>
    questions.map(() => ""),
  );
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isComplete = answers !== null;
  const orderedQuestions = useMemo(
    () =>
      questions
        .map((question, questionIndex) => ({ question, questionIndex }))
        .sort((left, right) =>
          left.question.answer.localeCompare(right.question.answer, "fr", {
            numeric: true,
            sensitivity: "base",
          }),
        ),
    [questions],
  );
  const foundCount = (answers ?? enteredAnswers).filter(Boolean).length;

  function acceptAnswer(value: string, reportInvalid = false) {
    const normalizedAnswer = normalizeQuizAnswer(value);
    if (!normalizedAnswer) return;

    const match = orderedQuestions.find(
      ({ question, questionIndex }) =>
        !enteredAnswers[questionIndex] &&
        normalizeQuizAnswer(question.answer) === normalizedAnswer,
    );

    if (!match) {
      if (reportInvalid) {
        setInputError("Cette réponse ne figure pas dans la liste attendue.");
      }
      return;
    }

    const nextAnswers = [...enteredAnswers];
    nextAnswers[match.questionIndex] = value.trim();
    setEnteredAnswers(nextAnswers);
    setInputValue("");
    setInputError(null);
    inputRef.current?.focus();

    if (nextAnswers.every(Boolean)) onSubmit(nextAnswers);
  }

  return (
    <div className={styles.quizList}>
      {!isComplete && (
        <form
          className={styles.quizListEntry}
          onSubmit={(event) => {
            event.preventDefault();
            acceptAnswer(inputValue, true);
          }}
        >
          <label htmlFor="quiz-list-answer">Saisir une réponse</label>
          <input
            autoComplete="off"
            autoFocus
            id="quiz-list-answer"
            onChange={(event) => {
              const value = event.target.value;
              setInputValue(value);
              setInputError(null);
              acceptAnswer(value);
            }}
            ref={inputRef}
            value={inputValue}
          />
          {inputError && (
            <p className={styles.quizError} role="alert">
              {inputError}
            </p>
          )}
          <p className={styles.quizProgress}>
            {foundCount} réponse{foundCount === 1 ? "" : "s"} trouvée
            {foundCount === 1 ? "" : "s"} sur {questions.length}
          </p>
          <button
            className={styles.startQuizButton}
            disabled={!inputValue.trim()}
            type="submit"
          >
            Valider la réponse
          </button>
          <button
            className={styles.quizListFinish}
            type="button"
            onClick={() => onSubmit(enteredAnswers)}
          >
            Terminer et corriger
          </button>
        </form>
      )}
      <ol className={styles.quizListSlots} aria-label="Réponses attendues">
        {orderedQuestions.map(({ question, questionIndex }, index) => {
          const userAnswer = answers?.[questionIndex] ?? enteredAnswers[questionIndex];
          const isCorrect =
            userAnswer.trim() !== "" &&
            normalizeQuizAnswer(userAnswer) ===
              normalizeQuizAnswer(question.answer);

          return (
            <li
              className={`${styles.quizListSlot} ${isComplete ? (isCorrect ? styles.quizListCorrect : styles.quizListIncorrect) : ""}`}
              key={`${question.answer}-${questionIndex}`}
              aria-label={`Case ${index + 1} sur ${questions.length}`}
            >
              {userAnswer || (isComplete ? "—" : "")}
              {isComplete && !isCorrect && (
                <small>Réponse attendue : {question.answer}</small>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function QuizQuestionView({
  question,
  questionIndex,
  questionCount,
  selectedAnswer,
  attempts,
  category,
  format,
  onAnswer,
}: {
  question: QuizQuestion;
  questionIndex: number;
  questionCount: number;
  selectedAnswer: string | null;
  attempts: number;
  category: QuizCategoryId;
  format: QuizFormatId;
  onAnswer: (answer: string) => void;
}) {
  const isResolved =
    selectedAnswer !== null &&
    (attempts >= 2 ||
      normalizeQuizAnswer(selectedAnswer) ===
        normalizeQuizAnswer(question.answer));

  return (
    <>
      <p className={styles.quizProgress}>
        Question {questionIndex + 1} sur {questionCount}
      </p>
      <div className={styles.quizQuestion}>
        <h2>{question.prompt}</h2>
        {format === "map" ? (
          <QuizMap
            category={category}
            correctAnswer={question.answer}
            disabled={isResolved}
            onAnswer={onAnswer}
            selectedAnswer={selectedAnswer}
          />
        ) : (
          <div
            className={styles.quizChoices}
            role="radiogroup"
            aria-label="Choisis une réponse"
          >
            {question.choices.map((choice) => {
              const isSelected = selectedAnswer === choice;
              const answerClass = isSelected
                ? choice === question.answer
                  ? styles.correctChoice
                  : styles.incorrectChoice
                : "";

              return (
                <button
                  aria-checked={isSelected}
                  className={`${styles.quizChoice} ${answerClass}`}
                  disabled={isResolved}
                  key={choice}
                  onClick={() => onAnswer(choice)}
                  role="radio"
                  type="button"
                >
                  {choice}
                </button>
              );
            })}
          </div>
        )}
        {selectedAnswer !== null && (
          <p className={styles.quizFeedback} role="status">
            {selectedAnswer === question.answer
              ? "Bonne réponse !"
              : attempts === 1
                ? "Pas tout à fait. Essaie encore !"
                : `La bonne réponse était : ${question.answer}`}
          </p>
        )}
      </div>
    </>
  );
}

export default function QuizGame({
  title,
  category,
  state,
  onAnswer,
  onNext,
  onSubmitList,
  onLeave,
}: QuizGameProps) {
  const isComplete = state.status === "complete";
  const isAnswerResolved =
    state.status === "playing" &&
    state.format !== "list" &&
    state.selectedAnswer !== null &&
    (state.attempts >= 2 ||
      normalizeQuizAnswer(state.selectedAnswer) ===
        normalizeQuizAnswer(state.questions[state.questionIndex].answer));

  useEffect(() => {
    if (!isAnswerResolved) return;
    const timeout = window.setTimeout(onNext, 100);
    return () => window.clearTimeout(timeout);
  }, [isAnswerResolved, onNext, state]);

  return (
    <main
      className={`${styles.dashboardPage} ${state.format === "map" ? styles.dashboardPageMap : ""}`}
    >
      <DashboardHeader>
        <button
          className={styles.logoutButton}
          type="button"
          onClick={onLeave}
        >
          Retour aux quiz
        </button>
      </DashboardHeader>
      <section
        className={`${styles.quizGame} ${state.format === "map" ? styles.quizGameMap : ""}`}
        aria-labelledby="quiz-game-title"
      >
        <p className={styles.eyebrow}>{title}</p>
        <h1 id="quiz-game-title">
          {isComplete ? "Quiz terminé !" : "À toi de jouer"}
        </h1>
        {isComplete ? (
          <>
            {state.format === "list" && (
              <QuizListView
                answers={state.submittedAnswers}
                onSubmit={onSubmitList}
                questions={state.questions}
              />
            )}
            <QuizResult
              error={state.error}
              onLeave={onLeave}
              score={state.score}
              total={state.questions.length}
            />
          </>
        ) : state.format === "list" ? (
          <>
            <QuizListView
              answers={null}
              onSubmit={onSubmitList}
              questions={state.questions}
            />
          </>
        ) : (
          <QuizQuestionView
            category={category}
            format={state.format}
            onAnswer={onAnswer}
            question={state.questions[state.questionIndex]}
            questionCount={state.questions.length}
            questionIndex={state.questionIndex}
            selectedAnswer={state.selectedAnswer}
            attempts={state.attempts}
          />
        )}
      </section>
    </main>
  );
}
