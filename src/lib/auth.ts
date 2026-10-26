import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "geolearner_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 14;

type SessionPayload = {
  email: string;
  expiresAt: number;
};

function getAuthConfig() {
  const email = process.env.GEOLEARNER_EMAIL?.trim().toLowerCase();
  const password = process.env.GEOLEARNER_PASSWORD;
  const secret = process.env.GEOLEARNER_SESSION_SECRET;

  if (!email || !password || !secret || secret.length < 32) {
    return null;
  }

  return { email, password, secret };
}

function signature(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function stringsMatch(first: string, second: string) {
  const firstHash = createHash("sha256").update(first).digest();
  const secondHash = createHash("sha256").update(second).digest();
  return timingSafeEqual(firstHash, secondHash);
}

export function credentialsAreConfigured() {
  return getAuthConfig() !== null;
}

export function credentialsMatch(email: string, password: string) {
  const config = getAuthConfig();

  if (!config) {
    return false;
  }

  const emailMatches = stringsMatch(email.trim().toLowerCase(), config.email);
  const passwordMatches = stringsMatch(password, config.password);
  return emailMatches && passwordMatches;
}

export function createSessionToken(email: string) {
  const config = getAuthConfig();

  if (!config) {
    throw new Error("La configuration de connexion est incomplète.");
  }

  const payload: SessionPayload = {
    email,
    expiresAt: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
    "base64url",
  );

  return `${encodedPayload}.${signature(encodedPayload, config.secret)}`;
}

export async function getSession(): Promise<SessionPayload | null> {
  const config = getAuthConfig();

  if (!config) {
    return null;
  }

  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const [encodedPayload, providedSignature, extraPart] = token?.split(".") ?? [];

  if (!encodedPayload || !providedSignature || extraPart) {
    return null;
  }

  if (!stringsMatch(providedSignature, signature(encodedPayload, config.secret))) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    ) as Partial<SessionPayload>;

    if (
      typeof payload.email !== "string" ||
      !stringsMatch(payload.email, config.email) ||
      typeof payload.expiresAt !== "number" ||
      payload.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return { email: payload.email, expiresAt: payload.expiresAt };
  } catch {
    return null;
  }
}

export const sessionCookie = {
  name: COOKIE_NAME,
  maxAge: SESSION_DURATION_SECONDS,
};
