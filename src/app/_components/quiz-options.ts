import type { QuizCategoryId, QuizFormatId } from "@/lib/quiz-engine";

export const quizModes = [
  { id: "relaxed", title: "À mon rythme", detail: "Sans chrono, tranquillement" },
  { id: "timed", title: "Contre-la-montre", detail: "Pour me challenger" },
  { id: "revision", title: "Révision", detail: "Revoir mes erreurs" },
] as const;

export type QuizModeId = (typeof quizModes)[number]["id"];

export const quizFormats: {
  id: QuizFormatId;
  title: string;
  detail: string;
}[] = [
  {
    id: "classic",
    title: "Quiz classique",
    detail: "Choisis la bonne réponse",
  },
  {
    id: "list",
    title: "Saisir",
    detail: "Saisis les réponses une par une",
  },
  {
    id: "map",
    title: "Sur une carte",
    detail: "Repère chaque réponse à son emplacement",
  },
];

export const quizIcons: Record<QuizCategoryId, string> = {
  departments: "⌖",
  prefectures: "⌂",
  regions: "✳",
  "french-cities": "◉",
  "england-counties": "⌁",
  "england-seats": "⌂",
  "england-cities": "◉",
  "world-population": "◎",
  "world-area": "◌",
  "region-cities": "⌖",
  "occitanie-cities": "✳",
};
