import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSessionToken,
  credentialsAreConfigured,
  credentialsMatch,
} from "../../src/lib/auth";

describe("authentication configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires an email, password, and a session secret of at least 32 characters", () => {
    vi.stubEnv("GEOLEARNER_EMAIL", "owner@example.com");
    vi.stubEnv("GEOLEARNER_PASSWORD", "correct-horse");
    vi.stubEnv("GEOLEARNER_SESSION_SECRET", "short");

    expect(credentialsAreConfigured()).toBe(false);
    expect(credentialsMatch("owner@example.com", "correct-horse")).toBe(false);
    expect(() => createSessionToken("owner@example.com")).toThrow(
      "La configuration de connexion est incomplète.",
    );
  });

  it("normalizes the email but requires an exact password match", () => {
    vi.stubEnv("GEOLEARNER_EMAIL", "Owner@Example.com ");
    vi.stubEnv("GEOLEARNER_PASSWORD", "correct-horse");
    vi.stubEnv("GEOLEARNER_SESSION_SECRET", "s".repeat(32));

    expect(credentialsAreConfigured()).toBe(true);
    expect(credentialsMatch(" OWNER@example.com ", "correct-horse")).toBe(true);
    expect(credentialsMatch("owner@example.com", "Correct-horse")).toBe(false);
  });

  it("creates a signed token with a payload and signature", () => {
    vi.stubEnv("GEOLEARNER_EMAIL", "owner@example.com");
    vi.stubEnv("GEOLEARNER_PASSWORD", "correct-horse");
    vi.stubEnv("GEOLEARNER_SESSION_SECRET", "s".repeat(32));

    const token = createSessionToken("owner@example.com");

    expect(token.split(".")).toHaveLength(2);
  });
});
