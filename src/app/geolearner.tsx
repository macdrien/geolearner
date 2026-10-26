"use client";

import { useRouter } from "next/navigation";
import type { GeographyData } from "@/lib/quiz-engine";
import LoginPage from "./_components/login-page";
import QuizDashboard from "./_components/quiz-dashboard";

type GeoLearnerProps = {
  email: string | null;
  geography: GeographyData;
};

export default function GeoLearner({ email, geography }: GeoLearnerProps) {
  const router = useRouter();

  async function handleLogin(userEmail: string, password: string) {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail, password }),
      });
      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        return result.error ?? "La connexion a échoué. Réessaie.";
      }

      router.refresh();
      return null;
    } catch {
      return "Le serveur est injoignable. Vérifie ta connexion et réessaie.";
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error(`La déconnexion a échoué (${response.status}).`);
      }
      router.refresh();
    } catch (error) {
      console.error("Impossible de fermer la session :", error);
      window.alert("La déconnexion a échoué. Vérifie ta connexion et réessaie.");
    }
  }

  if (!email) return <LoginPage onLogin={handleLogin} />;

  return (
    <QuizDashboard
      email={email}
      geography={geography}
      onLogout={handleLogout}
    />
  );
}
