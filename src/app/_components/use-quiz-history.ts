"use client";

import { useEffect, useState } from "react";
import {
  loadCompletedQuizzes,
  subscribeToQuizHistory,
  type CompletedQuiz,
} from "@/lib/quiz-history";

type QuizHistoryState = {
  entries: CompletedQuiz[];
  isLoaded: boolean;
  hasError: boolean;
};

export default function useQuizHistory() {
  const [state, setState] = useState<QuizHistoryState>({
    entries: [],
    isLoaded: false,
    hasError: false,
  });

  useEffect(() => {
    let isActive = true;

    const refreshHistory = () => {
      if (!isActive) return;

      try {
        setState({
          entries: loadCompletedQuizzes(),
          isLoaded: true,
          hasError: false,
        });
      } catch (error) {
        console.error("Impossible de lire l’historique GeoLearner :", error);
        setState((previousState) => ({
          ...previousState,
          isLoaded: true,
          hasError: true,
        }));
      }
    };
    const scheduleRefresh = () => {
      void Promise.resolve().then(refreshHistory);
    };

    scheduleRefresh();
    const unsubscribeFromHistory = subscribeToQuizHistory(scheduleRefresh);

    return () => {
      isActive = false;
      unsubscribeFromHistory();
    };
  }, []);

  return state;
}
