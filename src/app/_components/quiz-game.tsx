"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  isQuizAnswerCorrect,
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
  onTimeExpired: () => void;
  onNext: () => void;
  onSubmitList: (answers: string[]) => void;
  onLeave: () => void;
};

function QuizResult({
  score,
  total,
  lost,
  error,
  onLeave,
}: {
  score: number;
  total: number;
  lost: boolean;
  error: string | null;
  onLeave: () => void;
}) {
  return (
    <div className={styles.quizResult} role="status">
      <strong>
        {lost ? "Temps écoulé : quiz perdu" : `Ton score : ${score} / ${total}`}
      </strong>
      <p>
        {lost
          ? `Ton score au moment de la fin du temps était de ${score} / ${total}.`
          : "Le résultat est conservé uniquement sur cet appareil."}
      </p>
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
  areaCode,
  quizAnswers,
  format,
  onAnswer,
}: {
  question: QuizQuestion;
  questionIndex: number;
  questionCount: number;
  selectedAnswer: string | null;
  attempts: number;
  category: QuizCategoryId;
  areaCode?: string;
  quizAnswers: string[];
  format: QuizFormatId;
  onAnswer: (answer: string) => void;
}) {
  const isResolved =
    selectedAnswer !== null &&
    (attempts >= 2 ||
      isQuizAnswerCorrect(question, selectedAnswer));
  const isCorrectAnswer =
    selectedAnswer !== null &&
    isQuizAnswerCorrect(question, selectedAnswer);

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
            areaCode={areaCode}
            quizAnswers={quizAnswers}
            correctAnswer={question.answer}
            acceptedAnswers={question.acceptedAnswers}
            revealCorrectAnswer={
              attempts >= 2 && selectedAnswer !== null && !isCorrectAnswer
            }
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
                ? isQuizAnswerCorrect(question, choice)
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
          <p
            className={`${styles.quizFeedback} ${isCorrectAnswer ? styles.quizFeedbackCorrect : styles.quizFeedbackIncorrect}`}
            role="status"
          >
            <strong>{isCorrectAnswer ? "Bonne réponse !" : "Incorrect."}</strong>{" "}
            {isCorrectAnswer
              ? `${selectedAnswer} est la bonne réponse.`
              : attempts === 1
                ? `${selectedAnswer} n’est pas la bonne réponse. Essaie encore.`
                : `${selectedAnswer} n’est pas la bonne réponse. La bonne réponse était : ${question.answer}.`}
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
  onTimeExpired,
  onNext,
  onSubmitList,
  onLeave,
}: QuizGameProps) {
  const isComplete = state.status === "complete";
  const quizAnswers = useMemo(
    () => state.questions.map(({ answer }) => answer),
    [state.questions],
  );
  const questionIndex =
    state.status === "playing" ? state.questionIndex : -1;
  const isPlaying = state.status === "playing";
  const mode = isPlaying ? state.mode : null;
  const format = isPlaying ? state.format : null;
  const onTimeExpiredRef = useRef(onTimeExpired);
  const [remainingSeconds, setRemainingSeconds] = useState(15);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const isAnswerResolved =
    state.status === "playing" &&
    state.format !== "list" &&
    state.selectedAnswer !== null &&
    (state.attempts >= 2 ||
      isQuizAnswerCorrect(
        state.questions[state.questionIndex],
        state.selectedAnswer,
      ));

  useEffect(() => {
    onTimeExpiredRef.current = onTimeExpired;
  }, [onTimeExpired]);

  useEffect(() => {
    if (!isPlaying || mode !== "race" || format === "list" || isAnswerResolved) {
      return;
    }

    const deadline = Date.now() + 15_000;
    const expirationTimeout = window.setTimeout(
      () => onTimeExpiredRef.current(),
      15_000,
    );
    const interval = window.setInterval(() => {
      const remainingMilliseconds = Math.max(0, deadline - Date.now());
      setRemainingSeconds(Math.ceil(remainingMilliseconds / 1_000));
    }, 250);

    return () => {
      window.clearTimeout(expirationTimeout);
      window.clearInterval(interval);
    };
  }, [
    isAnswerResolved,
    isPlaying,
    mode,
    format,
    questionIndex,
  ]);

  useEffect(() => {
    if (!isPlaying || mode !== "timed") return;

    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1_000));
    }, 1_000);
    return () => window.clearInterval(interval);
  }, [isPlaying, mode]);

  useEffect(() => {
    if (!isAnswerResolved) return;
    const timeout = window.setTimeout(() => {
      setRemainingSeconds(15);
      onNext();
    }, 100);
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
        {state.status === "playing" && state.mode === "race" && (
          <p className={styles.quizClock} role="timer" aria-label="Temps restant">
            {remainingSeconds} s par question
          </p>
        )}
        {state.status === "playing" && state.mode === "timed" && (
          <p className={styles.quizClock} role="timer" aria-label="Temps écoulé">
            Chronomètre : {Math.floor(elapsedSeconds / 60)}:
            {String(elapsedSeconds % 60).padStart(2, "0")}
          </p>
        )}
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
              lost={state.lost}
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
            areaCode={state.areaCode}
            quizAnswers={quizAnswers}
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
