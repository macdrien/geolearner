"use client";

import { useEffect, useState } from "react";
import {
  quizCategories,
  getAvailableQuizFormats,
  getQuizQuestionCount,
  getSelectedQuizSize,
  isRankedQuizCategory,
  type GeographyData,
  type QuizCategoryId,
  type QuizFormatId,
  type QuizRequest,
  type QuizSize,
} from "@/lib/quiz-engine";
import DashboardHeader from "./dashboard-header";
import Brand from "./brand";
import QuizConfiguration from "./quiz-configuration";
import {
  quizModes,
  quizFormats,
  type QuizModeId,
} from "./quiz-options";
import QuizGame from "./quiz-game";
import QuizHistory from "./quiz-history";
import QuizSummary from "./quiz-summary";
import useQuizHistory from "./use-quiz-history";
import useQuizSession from "./use-quiz-session";
import styles from "../page.module.css";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

type QuizDashboardProps = {
  email: string;
  geography: GeographyData;
  onLogout: () => void;
};

export default function QuizDashboard({
  email,
  geography,
  onLogout,
}: QuizDashboardProps) {
  const [category, setCategory] = useState<QuizCategoryId>("departments");
  const [format, setFormat] = useState<QuizFormatId>("classic");
  const [mapIdentification, setMapIdentification] = useState<"name" | "code">(
    "name",
  );
  const [mode, setMode] = useState<QuizModeId>(quizModes[0].id);
  const [quizSize, setQuizSize] = useState<QuizSize>(10);
  const [regionCode, setRegionCode] = useState(
    geography.frenchRegions[0]?.code ?? "",
  );
  const [departmentCode, setDepartmentCode] = useState(
    geography.occitanieDepartments[0]?.code ?? "",
  );
  const [installPrompt, setInstallPrompt] =
    useState<InstallPromptEvent | null>(null);
  const history = useQuizHistory();
  const quizSession = useQuizSession(geography);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
  }, []);

  async function handleInstall() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  function handleStartQuiz(request: QuizRequest) {
    quizSession.startQuiz(request, mode);
  }

  function handleModeChange(nextMode: QuizModeId) {
    setMode(nextMode);
    if (nextMode === "race" && format === "list") setFormat("classic");
  }

  function handleCategoryChange(nextCategory: QuizCategoryId) {
    setCategory(nextCategory);
    setFormat((currentFormat) =>
      getAvailableQuizFormats(nextCategory).includes(currentFormat)
        ? currentFormat
        : "classic",
    );
  }

  function handleNextQuestion() {
    const selectedCategory = quizCategories.find(
      (option) => option.id === category,
    );
    const selectedMode = quizModes.find((option) => option.id === mode);
    const selectedFormat = quizFormats.find((option) => option.id === format);

    quizSession.advanceQuestion(
      selectedCategory?.title ?? "Quiz de géographie",
      `${selectedFormat?.title ?? "Quiz classique"} · ${selectedMode?.title ?? "À mon rythme"}`,
    );
  }

  function handleSubmitListAnswers(answers: string[]) {
    const selectedCategory = quizCategories.find(
      (option) => option.id === category,
    );
    const selectedMode = quizModes.find((option) => option.id === mode);
    const selectedFormat = quizFormats.find((option) => option.id === format);
    quizSession.submitListAnswers(
      answers,
      selectedCategory?.title ?? "Quiz de géographie",
      `${selectedFormat?.title ?? "Saisir"} · ${selectedMode?.title ?? "À mon rythme"}`,
    );
  }

  function handleTimeExpired() {
    const selectedCategory = quizCategories.find(
      (option) => option.id === category,
    );
    const selectedMode = quizModes.find((option) => option.id === mode);
    const selectedFormat = quizFormats.find((option) => option.id === format);

    quizSession.timeExpired(
      selectedCategory?.title ?? "Quiz de géographie",
      `${selectedFormat?.title ?? "Quiz classique"} · ${selectedMode?.title ?? "Chronométré"}`,
    );
  }

  if (quizSession.state.status !== "idle") {
    const title =
      quizCategories.find((option) => option.id === category)?.title ??
      "Quiz de géographie";

    return (
      <QuizGame
        title={title}
        category={category}
        state={quizSession.state}
        onAnswer={quizSession.answerQuestion}
        onTimeExpired={handleTimeExpired}
        onNext={handleNextQuestion}
        onSubmitList={handleSubmitListAnswers}
        onLeave={quizSession.leaveQuiz}
      />
    );
  }

  const questionCountError = quizSession.state.error;
  const areaCode =
    category === "region-cities"
      ? regionCode
      : category === "occitanie-cities"
        ? departmentCode
        : undefined;
  const displayedQuestionCount = isRankedQuizCategory(category)
    ? getSelectedQuizSize(geography, category, quizSize, areaCode)
    : getQuizQuestionCount(geography, category, areaCode);

  return (
    <main className={styles.dashboardPage}>
      <DashboardHeader>
        {installPrompt && (
          <button
            className={styles.installButton}
            type="button"
            onClick={handleInstall}
          >
            <span aria-hidden="true">↓</span> Installer l’app
          </button>
        )}
        <span className={styles.accountEmail}>{email}</span>
        <button
          className={styles.logoutButton}
          type="button"
          onClick={onLogout}
        >
          Déconnexion
        </button>
      </DashboardHeader>

      <section className={styles.welcome} aria-labelledby="welcome-title">
        <div>
          <p className={styles.eyebrow}>Ton espace personnel</p>
          <h1 id="welcome-title">
            Prêt·e à explorer
            <br />
            <span>le monde ?</span>
          </h1>
          <p className={styles.welcomeDescription}>
            Choisis un thème et une façon de jouer. Tes prochains voyages
            géographiques commencent ici.
          </p>
        </div>
        <div className={styles.welcomeArtwork} aria-hidden="true">
          <span className={styles.artworkSun} />
          <span className={styles.artworkGlobe}>
            <svg viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="71" />
              <path d="M23 90h134M90 19c23 20 34 44 34 71s-11 51-34 71M90 19c-23 20-34 44-34 71s11 51 34 71M35 53c35 17 65 17 110 0M35 127c35-17 65-17 110 0" />
              <path
                className={styles.globeLand}
                d="m49 54 18-14 12 5-4 12-13 4-5 14-13-5 3-16Zm42 22 19-9 17 7-4 16-14 8-5 18-14-4-7-17 8-8Z"
              />
            </svg>
          </span>
          <span className={styles.artworkLabel}>À toi de jouer</span>
          <span className={styles.artworkSparkle}>✳</span>
        </div>
      </section>

      <div className={styles.dashboardGrid}>
        <QuizConfiguration
          geography={geography}
          category={category}
          format={format}
          mapIdentification={mapIdentification}
          mode={mode}
          quizSize={quizSize}
          regionCode={regionCode}
          departmentCode={departmentCode}
          error={questionCountError}
          onCategoryChange={handleCategoryChange}
          onFormatChange={setFormat}
          onMapIdentificationChange={setMapIdentification}
          onModeChange={handleModeChange}
          onQuizSizeChange={setQuizSize}
          onRegionChange={setRegionCode}
          onDepartmentChange={setDepartmentCode}
          onStart={handleStartQuiz}
        />
        <QuizSummary
          category={category}
          format={format}
          mode={mode}
          questionCount={displayedQuestionCount}
        />
      </div>

      <QuizHistory
        entries={history.entries}
        isLoaded={history.isLoaded}
        hasError={history.hasError}
      />

      <footer className={styles.dashboardFooter}>
        <Brand />
        <span>Fait pour apprendre le monde, à ton rythme.</span>
      </footer>
    </main>
  );
}
