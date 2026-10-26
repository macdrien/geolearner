import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadCompletedQuizzes,
  recordCompletedQuiz,
  subscribeToQuizHistory,
} from "../../src/lib/quiz-history";

const historyKey = "geolearner:completed-attempts:v1";

describe("quiz history", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty history when nothing has been saved", () => {
    expect(loadCompletedQuizzes()).toEqual([]);
  });

  it("records a quiz at the beginning of the saved history", () => {
    localStorage.setItem(
      historyKey,
      JSON.stringify([
        {
          id: "older",
          questionnaire: "Capitales",
          mode: "Révision",
          completedAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    );
    vi.spyOn(crypto, "randomUUID").mockReturnValue("new-quiz");

    recordCompletedQuiz({
      questionnaire: "Drapeaux",
      mode: "À mon rythme",
      score: "8/10",
      completedAt: "2026-02-01T00:00:00.000Z",
    });

    expect(loadCompletedQuizzes()).toEqual([
      {
        id: "new-quiz",
        questionnaire: "Drapeaux",
        mode: "À mon rythme",
        score: "8/10",
        completedAt: "2026-02-01T00:00:00.000Z",
      },
      {
        id: "older",
        questionnaire: "Capitales",
        mode: "Révision",
        completedAt: "2026-01-01T00:00:00.000Z",
      },
    ]);
  });

  it("rejects malformed saved history", () => {
    localStorage.setItem(historyKey, JSON.stringify([{ questionnaire: "Pays" }]));

    expect(() => loadCompletedQuizzes()).toThrow(
      "L’historique enregistré est invalide.",
    );
  });

  it("notifies subscribers when history changes and stops after unsubscribe", () => {
    const callback = vi.fn();
    const unsubscribe = subscribeToQuizHistory(callback);

    recordCompletedQuiz({ questionnaire: "Pays", mode: "Révision" });
    expect(callback).toHaveBeenCalledOnce();

    unsubscribe();
    recordCompletedQuiz({ questionnaire: "Capitales", mode: "Chrono" });
    expect(callback).toHaveBeenCalledOnce();
  });
});
