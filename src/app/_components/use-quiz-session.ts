"use client";

import { useReducer } from "react";
import {
  buildQuiz,
  normalizeQuizAnswer,
  type GeographyData,
  type QuizFormatId,
  type QuizQuestion,
  type QuizRequest,
} from "@/lib/quiz-engine";
import { recordCompletedQuiz } from "@/lib/quiz-history";

export type QuizSessionState =
  | { status: "idle"; error: string | null }
  | {
      status: "playing";
      format: QuizFormatId;
      questions: QuizQuestion[];
      questionIndex: number;
      selectedAnswer: string | null;
      attempts: number;
      score: number;
    }
  | {
      status: "complete";
      format: QuizFormatId;
      questions: QuizQuestion[];
      score: number;
      error: string | null;
      submittedAnswers: string[] | null;
    };

type QuizSessionAction =
  | { type: "started"; format: QuizFormatId; questions: QuizQuestion[] }
  | { type: "start-failed"; error: string }
  | { type: "answered"; answer: string }
  | {
      type: "list-submitted";
      answers: string[];
      score: number;
      error: string | null;
    }
  | { type: "next" }
  | { type: "finished"; error: string | null }
  | { type: "left" };

const initialState: QuizSessionState = { status: "idle", error: null };

function quizSessionReducer(
  state: QuizSessionState,
  action: QuizSessionAction,
): QuizSessionState {
  switch (action.type) {
    case "started":
      return {
        status: "playing",
        format: action.format,
        questions: action.questions,
        questionIndex: 0,
        selectedAnswer: null,
        attempts: 0,
        score: 0,
      };
    case "start-failed":
      return { status: "idle", error: action.error };
    case "answered":
      if (
        state.status !== "playing" ||
        state.format === "list" ||
        state.attempts >= 2 ||
        state.selectedAnswer ===
          state.questions[state.questionIndex].answer
      ) {
        return state;
      }
      {
        const isCorrect =
          normalizeQuizAnswer(action.answer) ===
          normalizeQuizAnswer(state.questions[state.questionIndex].answer);
        return {
          ...state,
          selectedAnswer: action.answer,
          attempts: state.attempts + 1,
          score: isCorrect ? state.score + 1 : state.score,
        };
      }
    case "list-submitted":
      if (state.status !== "playing" || state.format !== "list") return state;
      return {
        status: "complete",
        format: state.format,
        questions: state.questions,
        score: action.score,
        error: action.error,
        submittedAnswers: action.answers,
      };
    case "next":
      if (
        state.status !== "playing" ||
        state.selectedAnswer === null ||
        (state.attempts < 2 &&
          normalizeQuizAnswer(state.selectedAnswer) !==
            normalizeQuizAnswer(state.questions[state.questionIndex].answer))
      ) {
        return state;
      }
      return {
        ...state,
        questionIndex: state.questionIndex + 1,
        selectedAnswer: null,
        attempts: 0,
      };
    case "finished":
      if (state.status !== "playing") return state;
      return {
        status: "complete",
        format: state.format,
        questions: state.questions,
        score: state.score,
        error: action.error,
        submittedAnswers: null,
      };
    case "left":
      return initialState;
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function useQuizSession(geography: GeographyData) {
  const [state, dispatch] = useReducer(quizSessionReducer, initialState);

  function startQuiz(request: QuizRequest) {
    try {
      dispatch({
        type: "started",
        format: request.format ?? "classic",
        questions: buildQuiz(geography, request),
      });
    } catch (error) {
      console.error("Impossible de préparer ce quiz :", error);
      dispatch({
        type: "start-failed",
        error: errorMessage(error, "Impossible de préparer ce quiz."),
      });
    }
  }

  function answerQuestion(answer: string) {
    dispatch({ type: "answered", answer });
  }

  function advanceQuestion(questionnaire: string, mode: string) {
    if (
      state.status !== "playing" ||
      state.format === "list" ||
      state.selectedAnswer === null ||
      (state.attempts < 2 &&
        normalizeQuizAnswer(state.selectedAnswer) !==
          normalizeQuizAnswer(state.questions[state.questionIndex].answer))
    ) {
      return;
    }

    if (state.questionIndex + 1 < state.questions.length) {
      dispatch({ type: "next" });
      return;
    }

    let error: string | null = null;
    try {
      recordCompletedQuiz({
        questionnaire,
        mode,
        score: `${state.score}/${state.questions.length}`,
      });
    } catch (recordError) {
      console.error("Impossible d’enregistrer le résultat du quiz :", recordError);
      error =
        "Le quiz est terminé, mais son résultat n’a pas pu être enregistré sur cet appareil.";
    }

    dispatch({ type: "finished", error });
  }

  function submitListAnswers(
    answers: string[],
    questionnaire: string,
    mode: string,
  ) {
    if (state.status !== "playing" || state.format !== "list") return;
    if (answers.length !== state.questions.length) {
      throw new Error("Une réponse doit être fournie pour chaque question.");
    }

    const score = state.questions.filter(
      ({ answer }, index) =>
        normalizeQuizAnswer(answers[index]) === normalizeQuizAnswer(answer),
    ).length;
    let error: string | null = null;

    try {
      recordCompletedQuiz({
        questionnaire,
        mode,
        score: `${score}/${state.questions.length}`,
      });
    } catch (recordError) {
      console.error("Impossible d’enregistrer le résultat du quiz :", recordError);
      error =
        "Le quiz est terminé, mais son résultat n’a pas pu être enregistré sur cet appareil.";
    }

    dispatch({ type: "list-submitted", answers, score, error });
  }

  function leaveQuiz() {
    dispatch({ type: "left" });
  }

  return {
    state,
    startQuiz,
    answerQuestion,
    advanceQuestion,
    submitListAnswers,
    leaveQuiz,
  };
}
