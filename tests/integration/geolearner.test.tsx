import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GeoLearner from "../../src/app/geolearner";
import geography from "../../src/data/geography.json";
import { routerMocks } from "../setup";

describe("GeoLearner page interactions", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
    routerMocks.refresh.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("submits login credentials to the authentication endpoint", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    render(<GeoLearner email={null} geography={geography} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Adresse e-mail" }), {
      target: { value: "owner@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "correct-horse" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Me connecter" }));

    await waitFor(() => expect(routerMocks.refresh).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "owner@example.com",
        password: "correct-horse",
      }),
    });
  });

  it("displays login errors returned by the server", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({ error: "Adresse e-mail ou mot de passe incorrect." }),
        { status: 401 },
      ),
    );
    render(<GeoLearner email={null} geography={geography} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Adresse e-mail" }), {
      target: { value: "owner@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Mot de passe"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Me connecter" }));

    expect(
      await screen.findByText("Adresse e-mail ou mot de passe incorrect."),
    ).toBeTruthy();
    expect(routerMocks.refresh).not.toHaveBeenCalled();
  });

  it("updates the quiz summary when a quiz and mode are selected", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);

    const cities = screen.getByRole("button", {
      name: /Les plus grandes communes de France/,
    });
    const timed = screen.getByRole("button", { name: /Contre-la-montre/ });
    fireEvent.click(cities);
    fireEvent.click(timed);

    expect(cities.getAttribute("aria-pressed")).toBe("true");
    expect(timed.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen.getByRole("heading", {
        name: "Les plus grandes communes de France",
      }),
    ).toBeTruthy();
    expect(screen.getByText("10 questions · Contre-la-montre")).toBeTruthy();
  });

  it("updates regional quiz sizes and summaries from the selected region", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);

    fireEvent.click(
      screen.getByRole("button", {
        name: /Les plus grandes communes par région/,
      }),
    );
    fireEvent.change(screen.getByLabelText("Région"), {
      target: { value: "01" },
    });
    fireEvent.change(screen.getByLabelText("Nombre de questions"), {
      target: { value: "32" },
    });

    expect(screen.getByText("32 questions · À mon rythme")).toBeTruthy();
    expect(screen.getByRole("option", { name: "Toutes les communes (32)" }))
      .toBeTruthy();
  });

  it("groups quiz subjects, allows a retry, and advances automatically on the map", async () => {
    vi.useFakeTimers();
    render(<GeoLearner email="owner@example.com" geography={geography} />);

    expect(screen.getByRole("heading", { name: "France" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Angleterre" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Monde" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Sur une carte/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const map = screen.getByRole("group", {
      name: "Carte des départements métropolitains",
    });
    expect(map.getAttribute("viewBox")).toBe("0 0 720 560");
    expect(screen.getByRole("group", { name: "Carte de Mayotte" })).toBeTruthy();

    const prompt =
      screen.getByRole("heading", { level: 2 }).textContent ?? "";
    const correctDepartment = geography.departments.find(
      ({ name }) => prompt === `Place le département ${name} sur la carte.`,
    )?.name;
    expect(correctDepartment).toBeTruthy();
    expect(prompt).not.toContain("préfecture");

    const incorrectDepartment = geography.departments.find(
      ({ name }) => name !== correctDepartment,
    )?.name;
    if (!incorrectDepartment) throw new Error("Aucun département de repli.");

    fireEvent.click(
      screen.getByRole("button", { name: incorrectDepartment }),
    );
    expect(screen.getByRole("status").textContent).toContain("Essaie encore");

    fireEvent.click(
      screen.getByRole("button", { name: correctDepartment }),
    );
    expect(screen.getByRole("status").textContent).toContain("Bonne réponse");
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("Question 2 sur 101")).toBeTruthy();
  });

  it("reveals the answer and advances after a second incorrect answer", async () => {
    vi.useFakeTimers();
    render(<GeoLearner email="owner@example.com" geography={geography} />);
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const prompt = screen.getByRole("heading", { level: 2 }).textContent ?? "";
    const correctDepartment = geography.departments.find(({ prefecture }) =>
      prompt.includes(prefecture),
    )?.name;
    expect(correctDepartment).toBeTruthy();

    const incorrectChoices = within(screen.getByRole("radiogroup"))
      .getAllByRole("radio")
      .filter((choice) => choice.textContent !== correctDepartment);
    fireEvent.click(incorrectChoices[0]);
    expect(screen.getByRole("status").textContent).toContain("Essaie encore");

    fireEvent.click(incorrectChoices[1]);
    expect(screen.getByRole("status").textContent).toContain(correctDepartment);
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("Question 2 sur 101")).toBeTruthy();
  });

  it("displays the next question within the 200 ms performance budget", async () => {
    vi.useFakeTimers();
    render(<GeoLearner email="owner@example.com" geography={geography} />);
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const prompt = screen.getByRole("heading", { level: 2 }).textContent ?? "";
    const correctDepartment = geography.departments.find(({ prefecture }) =>
      prompt.includes(prefecture),
    )?.name;
    if (!correctDepartment) throw new Error("La réponse correcte est introuvable.");

    const startedAt = Date.now();
    const renderStartedAt = performance.now();
    fireEvent.click(screen.getByRole("radio", { name: correctDepartment }));
    await act(async () => {
      vi.advanceTimersByTime(199);
    });
    const elapsedMilliseconds = Date.now() - startedAt;
    const renderMilliseconds = performance.now() - renderStartedAt;

    expect(elapsedMilliseconds).toBeLessThan(200);
    expect(renderMilliseconds).toBeLessThan(200);
    expect(screen.getByText("Question 2 sur 101")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("uses region and world maps for the matching quiz subjects", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Les régions françaises/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Sur une carte/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));
    expect(
      screen.getByRole("group", { name: "Carte des régions métropolitaines" }),
    ).toBeTruthy();
    expect(screen.getByRole("group", { name: "Carte de Guadeloupe" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Retour aux quiz" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Les pays les plus peuplés/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const worldMap = screen.getByRole("group", { name: "Carte du monde" });
    expect(worldMap.getAttribute("viewBox")).toBe("0 0 720 480");
    expect(within(worldMap).getAllByRole("button")).toHaveLength(177);
  });

  it("zooms and pans maps with Ctrl-wheel and right-button dragging", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);
    fireEvent.click(screen.getByRole("button", { name: /Sur une carte/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const map = screen.getByRole("group", {
      name: "Carte des départements métropolitains",
    });
    fireEvent.wheel(map, { ctrlKey: true, deltaY: -100 });
    const zoomedMap = screen.getByRole("group", {
      name: "Carte des départements métropolitains",
    });
    expect(zoomedMap.querySelector("g")?.getAttribute("transform")).toContain(
      "scale(1.221",
    );

    fireEvent.mouseDown(zoomedMap, {
      button: 2,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.mouseMove(window, { clientX: 20, clientY: 20 });
    expect(zoomedMap.querySelector("g")?.getAttribute("transform")).not.toContain(
      "translate(360 280)",
    );
  });

  it("lets users identify departments by prefecture on a map", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Les préfectures françaises/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Sur une carte/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    expect(
      screen.getByRole("group", {
        name: "Carte des départements métropolitains",
      }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain(
      "préfecture est",
    );
  });

  it("offers department numbers as map question identifiers", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);
    fireEvent.click(screen.getByRole("button", { name: /Sur une carte/ }));
    fireEvent.change(screen.getByLabelText("Identifier les départements par"), {
      target: { value: "code" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const prompt = screen.getByRole("heading", { level: 2 }).textContent ?? "";
    expect(
      geography.departments.some(
        ({ code }) => prompt === `Place le département ${code} sur la carte.`,
      ),
    ).toBe(true);
  });

  it("accepts typed list answers into their sorted slots and keeps the input focused", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Les départements français/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Saisir/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const answerFields = screen.getAllByRole("textbox");
    expect(answerFields).toHaveLength(1);
    const input = answerFields[0];
    const slots = within(
      screen.getByRole("list", { name: "Réponses attendues" }),
    ).getAllByRole("listitem");
    expect(slots).toHaveLength(101);

    fireEvent.change(input, {
      target: { value: "Allier" },
    });
    expect(slots[0].textContent).toBe("");
    expect(slots[1].textContent).toBe("");
    expect(slots[2].textContent).toBe("Allier");
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, {
      target: { value: "Aîn" },
    });
    expect(slots[0].textContent).toBe("Aîn");
    expect(document.activeElement).toBe(input);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("completes a list as soon as every expected answer has been entered", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Les pays les plus peuplés/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Saisir/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    for (const country of geography.worldPopulation.slice(0, 10)) {
      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: country.name },
      });
    }

    expect(screen.getByRole("heading", { name: "Quiz terminé !" })).toBeTruthy();
    expect(screen.getByText("Ton score : 10 / 10")).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lets an incomplete list finish and shows the expected answers", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Les counties anglais/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Saisir/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Réponse incorrecte" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Valider la réponse" }));
    expect(screen.getByRole("alert").textContent).toContain("ne figure pas");
    fireEvent.click(screen.getByRole("button", { name: "Terminer et corriger" }));

    expect(screen.getByRole("heading", { name: "Quiz terminé !" })).toBeTruthy();
    expect(screen.getAllByText(/Réponse attendue :/).length).toBe(47);
    expect(screen.getByText("Ton score : 0 / 47")).toBeTruthy();
    expect(
      JSON.parse(
        localStorage.getItem("geolearner:completed-attempts:v1") ?? "[]",
      )[0].score,
    ).toBe("0/47");
  });

  it("completes a quiz using local state and saves its result without network calls", async () => {
    vi.useFakeTimers();
    render(<GeoLearner email="owner@example.com" geography={geography} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Les plus grandes communes de France/ }),
    );
    fireEvent.change(screen.getByLabelText("Nombre de questions"), {
      target: { value: "10" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    expect(
      screen.getByRole("heading", { name: "À toi de jouer" }),
    ).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();

    for (let question = 0; question < 10; question += 1) {
      const prompt = screen.getByRole("heading", { level: 2 }).textContent ?? "";
      const rankingPlace = prompt.match(/la (\d+)(?:re|e) place/);
      if (!rankingPlace) throw new Error("Le rang du quiz est introuvable.");
      const correctAnswer =
        geography.frenchCities[Number(rankingPlace[1]) - 1].name;
      const currentAnswer = screen.getAllByRole("radio")[0].textContent;

      if (currentAnswer !== correctAnswer) {
        fireEvent.click(screen.getByRole("radio", { name: currentAnswer ?? "" }));
        expect(screen.getByRole("status").textContent).toContain("Essaie encore");
      }
      fireEvent.click(screen.getByRole("radio", { name: correctAnswer }));
      await act(async () => {
        vi.advanceTimersByTime(100);
      });
    }

    expect(
      screen.getByRole("heading", { name: "Quiz terminé !" }),
    ).toBeTruthy();
    expect(fetch).not.toHaveBeenCalled();
    expect(
      JSON.parse(
        localStorage.getItem("geolearner:completed-attempts:v1") ?? "[]",
      ),
    ).toHaveLength(1);
  });

  it("renders saved attempts in the dashboard history", async () => {
    localStorage.setItem(
      "geolearner:completed-attempts:v1",
      JSON.stringify([
        {
          id: "attempt-1",
          questionnaire: "Capitales",
          mode: "À mon rythme",
          completedAt: "2026-06-15T12:00:00.000Z",
          score: "9/10",
        },
      ]),
    );
    render(<GeoLearner email="owner@example.com" geography={geography} />);

    await waitFor(() => {
      expect(screen.getByText("Capitales")).toBeTruthy();
    });
    expect(screen.getByText("9/10")).toBeTruthy();
    expect(screen.getByText("1 test")).toBeTruthy();
  });

  it("logs out through the authentication endpoint", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 }),
    );
    render(<GeoLearner email="owner@example.com" geography={geography} />);

    fireEvent.click(screen.getByRole("button", { name: "Déconnexion" }));

    await waitFor(() => expect(routerMocks.refresh).toHaveBeenCalledOnce());
    expect(fetch).toHaveBeenCalledWith("/api/auth/logout", { method: "POST" });
  });
});
