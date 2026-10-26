import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Home from "../../src/app/page";

const mocks = vi.hoisted(() => ({
  connection: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("next/server", () => ({
  connection: mocks.connection,
}));

vi.mock("@/lib/auth", () => ({
  getSession: mocks.getSession,
}));

describe("home page", () => {
  beforeEach(() => {
    mocks.connection.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows the private login page when there is no session", async () => {
    mocks.getSession.mockResolvedValue(null);

    render(await Home());

    expect(
      screen.getByRole("heading", { name: "Connecte-toi à ton espace" }),
    ).toBeTruthy();
    expect(screen.getByRole("textbox", { name: "Adresse e-mail" })).toBeTruthy();
    expect(screen.getByLabelText("Mot de passe")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Mon historique" })).toBeNull();
  });

  it("shows the dashboard for the authenticated session", async () => {
    mocks.getSession.mockResolvedValue({
      email: "owner@example.com",
      expiresAt: 1_800_000_000,
    });

    render(await Home());

    expect(
      screen.getByRole("heading", { name: /Prêt·e à explorer/ }),
    ).toBeTruthy();
    expect(screen.getByText("owner@example.com")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Mon historique" })).toBeTruthy();
    expect(
      screen.getByRole("button", { name: /Les départements français/ }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Déconnexion" })).toBeTruthy();
  });
});
