const HISTORY_KEY = "geolearner:completed-attempts:v1";
const HISTORY_UPDATED_EVENT = "geolearner:history-updated";

export type CompletedQuiz = {
  id: string;
  questionnaire: string;
  mode: string;
  completedAt: string;
  score?: string;
};

function isCompletedQuiz(value: unknown): value is CompletedQuiz {
  if (typeof value !== "object" || value === null) return false;

  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.questionnaire === "string" &&
    typeof entry.mode === "string" &&
    typeof entry.completedAt === "string" &&
    (entry.score === undefined || typeof entry.score === "string")
  );
}

export function loadCompletedQuizzes(): CompletedQuiz[] {
  const saved = localStorage.getItem(HISTORY_KEY);
  if (!saved) return [];

  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isCompletedQuiz)) {
    throw new Error("L’historique enregistré est invalide.");
  }

  return parsed;
}

export function recordCompletedQuiz(
  quiz: Omit<CompletedQuiz, "id" | "completedAt"> & {
    completedAt?: string;
  },
) {
  const completedQuiz: CompletedQuiz = {
    ...quiz,
    id: crypto.randomUUID(),
    completedAt: quiz.completedAt ?? new Date().toISOString(),
  };
  const history = loadCompletedQuizzes();
  history.unshift(completedQuiz);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  window.dispatchEvent(new Event(HISTORY_UPDATED_EVENT));
}

export function subscribeToQuizHistory(callback: () => void) {
  const handleHistoryUpdate = (event: Event) => {
    if (event instanceof StorageEvent && event.key !== HISTORY_KEY) return;
    callback();
  };

  window.addEventListener(HISTORY_UPDATED_EVENT, handleHistoryUpdate);
  window.addEventListener("storage", handleHistoryUpdate);

  return () => {
    window.removeEventListener(HISTORY_UPDATED_EVENT, handleHistoryUpdate);
    window.removeEventListener("storage", handleHistoryUpdate);
  };
}
