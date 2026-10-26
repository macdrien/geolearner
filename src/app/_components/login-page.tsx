"use client";

import { useState, type FormEvent } from "react";
import Brand from "./brand";
import styles from "../page.module.css";

type LoginPageProps = {
  onLogin: (email: string, password: string) => Promise<string | null>;
};

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const message = await onLogin(email, password);
      if (message) setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <header className={styles.loginHeader}>
        <Brand />
        <span className={styles.privateLabel}>
          <span aria-hidden="true" /> Espace privé
        </span>
      </header>
      <section className={styles.loginLayout}>
        <div className={styles.loginIntro}>
          <p className={styles.eyebrow}>Ton carnet de géographie</p>
          <h1>
            Le monde
            <br />
            <span>à portée de main.</span>
          </h1>
          <p className={styles.loginDescription}>
            Choisis tes prochains défis géographiques et retrouve tes progrès au
            même endroit.
          </p>
          <div className={styles.loginIllustration} aria-hidden="true">
            <span className={styles.orbit} />
            <span className={`${styles.orbit} ${styles.orbitTwo}`} />
            <span className={styles.planet}>G</span>
            <span className={styles.illustrationDot} />
            <span className={styles.illustrationStar}>✳</span>
          </div>
        </div>
        <div className={styles.loginCard}>
          <div className={styles.cardLock} aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <rect x="5" y="10" width="14" height="11" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
            </svg>
          </div>
          <p className={styles.eyebrow}>Bienvenue</p>
          <h2>Connecte-toi à ton espace</h2>
          <p className={styles.loginCardIntro}>
            Ce site est réservé à son propriétaire. Aucun compte ne peut être
            créé depuis cette page.
          </p>
          <form className={styles.loginForm} onSubmit={handleSubmit}>
            <label htmlFor="email">Adresse e-mail</label>
            <input
              autoComplete="username"
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <label htmlFor="password">Mot de passe</label>
            <input
              autoComplete="current-password"
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {error && (
              <p className={styles.formError} role="alert">
                {error}
              </p>
            )}
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={pending}
            >
              {pending ? "Connexion..." : "Me connecter"}
              <span aria-hidden="true">↗</span>
            </button>
          </form>
          <p className={styles.setupHint}>
            La connexion doit être configurée par le propriétaire du site.
          </p>
        </div>
      </section>
      <footer className={styles.loginFooter}>
        <span>GeoLearner · Ton espace, tes découvertes.</span>
        <span>Connexion sécurisée</span>
      </footer>
    </main>
  );
}
