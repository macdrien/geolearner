import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as login } from "../../src/app/api/auth/login/route";
import { POST as logout } from "../../src/app/api/auth/logout/route";

const authMocks = vi.hoisted(() => ({
  createSessionToken: vi.fn(),
  credentialsAreConfigured: vi.fn(),
  credentialsMatch: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  createSessionToken: authMocks.createSessionToken,
  credentialsAreConfigured: authMocks.credentialsAreConfigured,
  credentialsMatch: authMocks.credentialsMatch,
  sessionCookie: { name: "geolearner_session", maxAge: 1_209_600 },
}));

describe("authentication routes", () => {
  beforeEach(() => {
    authMocks.credentialsAreConfigured.mockReturnValue(true);
    authMocks.credentialsMatch.mockReturnValue(true);
    authMocks.createSessionToken.mockReturnValue("signed-session-token");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects login when server credentials are not configured", async () => {
    authMocks.credentialsAreConfigured.mockReturnValue(false);

    const response = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email: "owner@example.com",
          password: "correct-horse",
        }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: "La connexion n’est pas encore configurée sur le serveur.",
    });
  });

  it("rejects malformed login requests", async () => {
    const response = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
  });

  it("rejects incorrect credentials", async () => {
    authMocks.credentialsMatch.mockReturnValue(false);

    const response = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "owner@example.com",
          password: "wrong-password",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("sets an HttpOnly session cookie for valid credentials", async () => {
    const response = await login(
      new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: " Owner@Example.com ",
          password: "correct-horse",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "geolearner_session=signed-session-token",
    );
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(authMocks.createSessionToken).toHaveBeenCalledWith(
      "owner@example.com",
    );
  });

  it("expires the session cookie on logout", async () => {
    const response = await logout();

    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("geolearner_session=");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
  });
});
