import {
  act,
  cleanup,
  createEvent,
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

  it("places quiz settings beneath the answer format and makes them available", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Les plus grandes communes de France/ }),
    );

    const formatHeading = screen.getByRole("heading", {
      name: "Comment veux-tu répondre ?",
    });
    const settings = screen.getByRole("region", { name: "Options du quiz" });
    expect(within(settings).getByLabelText("Nombre de questions")).toBeTruthy();
    expect(
      formatHeading.compareDocumentPosition(settings) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("loses a race quiz after 15 seconds and distinguishes the stopwatch mode", async () => {
    vi.useFakeTimers();
    render(<GeoLearner email="owner@example.com" geography={geography} />);
    fireEvent.click(screen.getByRole("button", { name: /Saisir/ }));
    fireEvent.click(
      screen.getByRole("button", { name: /Contre-la-montre/ }),
    );

    expect(screen.queryByRole("button", { name: /Saisir/ })).toBeNull();
    expect(
      screen.getByRole("button", { name: /Quiz classique/ }).getAttribute(
        "aria-pressed",
      ),
    ).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));
    expect(screen.getByRole("timer", { name: "Temps restant" }).textContent)
      .toContain("15 s par question");

    await act(async () => {
      vi.advanceTimersByTime(14_999);
    });
    expect(screen.queryByText("Temps écoulé : quiz perdu")).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByText("Temps écoulé : quiz perdu")).toBeTruthy();
    expect(
      JSON.parse(
        localStorage.getItem("geolearner:completed-attempts:v1") ?? "[]",
      )[0].mode,
    ).toContain("Contre-la-montre");
    expect(fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Choisir un autre quiz" }));
    fireEvent.click(screen.getByRole("button", { name: /Chronométré/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));
    expect(screen.getByRole("timer", { name: "Temps écoulé" }).textContent)
      .toContain("Chronomètre : 0:00");
    await act(async () => {
      vi.advanceTimersByTime(2_000);
    });
    expect(screen.getByRole("timer", { name: "Temps écoulé" }).textContent)
      .toContain("Chronomètre : 0:02");
  });

  it("restarts the 15-second countdown for each new question", async () => {
    vi.useFakeTimers();
    render(<GeoLearner email="owner@example.com" geography={geography} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Contre-la-montre/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const prompt = screen.getByRole("heading", { level: 2 }).textContent ?? "";
    const correctDepartment = geography.departments.find(({ prefecture }) =>
      prompt.includes(prefecture),
    )?.name;
    if (!correctDepartment) throw new Error("La réponse correcte est introuvable.");

    await act(async () => {
      vi.advanceTimersByTime(14_000);
    });
    expect(screen.getByRole("timer", { name: "Temps restant" }).textContent)
      .toContain("1 s par question");

    fireEvent.click(screen.getByRole("radio", { name: correctDepartment }));
    await act(async () => {
      vi.advanceTimersByTime(100);
    });

    expect(screen.getByText("Question 2 sur 101")).toBeTruthy();
    expect(screen.getByRole("timer", { name: "Temps restant" }).textContent)
      .toContain("15 s par question");
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
    const incorrectFeedback = screen.getByRole("status");
    expect(incorrectFeedback.textContent).toContain("Incorrect.");
    expect(incorrectFeedback.textContent).toContain("Essaie encore.");
    expect(incorrectFeedback.getAttribute("class")).toContain(
      "quizFeedbackIncorrect",
    );
    expect(
      screen
        .getByRole("button", { name: incorrectDepartment })
        .getAttribute("class"),
    ).toContain("quizMapRegionIncorrect");

    fireEvent.click(
      screen.getByRole("button", { name: correctDepartment }),
    );
    const correctFeedback = screen.getByRole("status");
    expect(correctFeedback.textContent).toContain("Bonne réponse !");
    expect(correctFeedback.textContent).toContain(correctDepartment);
    expect(correctFeedback.getAttribute("class")).toContain(
      "quizFeedbackCorrect",
    );
    expect(
      screen
        .getByRole("button", { name: correctDepartment })
        .getAttribute("class"),
    ).toContain("quizMapRegionCorrect");
    await act(async () => {
      vi.advanceTimersByTime(100);
    });
    expect(screen.getByText("Question 2 sur 101")).toBeTruthy();
  });

  it("reveals the correct map zone after two incorrect selections", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);
    fireEvent.click(screen.getByRole("button", { name: /Sur une carte/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const map = screen.getByRole("group", {
      name: "Carte des départements métropolitains",
    });
    const prompt = screen.getByRole("heading", { level: 2 }).textContent ?? "";
    const correctDepartment = geography.departments.find(
      ({ name }) => prompt === `Place le département ${name} sur la carte.`,
    )?.name;
    if (!correctDepartment) throw new Error("Le département attendu est introuvable.");

    const incorrectDepartments = geography.departments
      .map(({ name }) => name)
      .filter((name) => name !== correctDepartment)
      .slice(0, 2);
    for (const name of incorrectDepartments) {
      fireEvent.click(within(map).getByRole("button", { name }));
    }

    expect(screen.getByRole("status").textContent).toContain(
      `La bonne réponse était : ${correctDepartment}.`,
    );
    expect(
      within(map)
        .getByRole("button", { name: correctDepartment })
        .getAttribute("class"),
    ).toContain("quizMapRegionCorrect");
    expect(
      within(map)
        .getByRole("button", { name: incorrectDepartments[1] })
        .getAttribute("class"),
    ).toContain("quizMapRegionIncorrect");
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

  it("renders interactive points for French, regional, Occitanie, and English city maps", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);
    const pointMapQuizzes = [
      {
        category: /Les plus grandes communes de France/,
        label: "Carte des communes françaises",
      },
      {
        category: /Les plus grandes communes par région/,
        label: "Carte des communes françaises",
      },
      {
        category: /Les communes d’Occitanie par département/,
        label: "Carte des communes françaises",
      },
      {
        category: /Les plus grandes villes d’Angleterre/,
        label: "Carte des counties anglais",
      },
    ] as const;

    for (const { category, label } of pointMapQuizzes) {
      fireEvent.click(screen.getByRole("button", { name: category }));
      fireEvent.click(screen.getByRole("button", { name: /Sur une carte/ }));
      fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

      const map = screen.getByRole("group", { name: label });
      expect(within(map).getAllByRole("button").length).toBeGreaterThan(0);
      fireEvent.click(screen.getByRole("button", { name: "Retour aux quiz" }));
    }
  });

  it("fits fifty French city markers over the metropolitan France map", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Les plus grandes communes de France/ }),
    );
    fireEvent.change(screen.getByLabelText("Nombre de questions"), {
      target: { value: "50" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sur une carte/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const map = screen.getByRole("group", {
      name: "Carte des communes françaises",
    });
    const backgrounds = map.querySelectorAll('path[aria-hidden="true"]');
    expect(backgrounds.length).toBeGreaterThan(90);

    const markers = within(map).getAllByRole("button");
    expect(markers.length).toBeGreaterThan(40);
    const background = backgrounds[0];
    if (!background) throw new Error("Le fond départemental est absent.");
    expect(background.getAttribute("role")).toBeNull();
    expect(background.getAttribute("class")).toContain("quizMapBackground");
    fireEvent.click(background);
    expect(screen.queryByRole("status")).toBeNull();

    const question =
      screen.getByRole("heading", { level: 2 }).textContent ?? "";
    const correctCity = geography.frenchCities
      .slice(0, 50)
      .find(({ name }) => question === `Trouve ${name} sur la carte.`);
    if (!correctCity) throw new Error("La ville correcte est introuvable.");
    const incorrectCity = markers.find(
      (marker) => marker.getAttribute("aria-label") !== correctCity.name,
    );
    if (!incorrectCity) throw new Error("Aucun point de ville incorrect disponible.");
    fireEvent.click(incorrectCity);
    expect(screen.getByRole("status").textContent).toContain(
      "n’est pas la bonne réponse. Essaie encore.",
    );
    expect(incorrectCity.getAttribute("class")).toContain(
      "quizMapRegionIncorrect",
    );

    fireEvent.click(
      within(map).getAllByRole("button", { name: correctCity.name })[0],
    );
    expect(screen.getByRole("status").textContent).toContain(
      `${correctCity.name} est la bonne réponse.`,
    );
    expect(
      within(map)
        .getAllByRole("button", { name: correctCity.name })[0]
        .getAttribute("class"),
    ).toContain("quizMapRegionCorrect");

    const markerCoordinates = markers.map((marker) => {
      const path = marker.getAttribute("d");
      const match = path?.match(/^M(-?[\d.]+),(-?[\d.]+)/);
      if (!match) throw new Error("Le point de ville ne contient pas de coordonnées.");
      return { x: Number(match[1]) + 5.5, y: Number(match[2]) };
    });
    const horizontalSpan =
      Math.max(...markerCoordinates.map(({ x }) => x)) -
      Math.min(...markerCoordinates.map(({ x }) => x));
    const verticalSpan =
      Math.max(...markerCoordinates.map(({ y }) => y)) -
      Math.min(...markerCoordinates.map(({ y }) => y));

    expect(horizontalSpan).toBeGreaterThan(420);
    expect(verticalSpan).toBeGreaterThan(400);
    expect(screen.getByRole("group", { name: "Carte de La Réunion" })).toBeTruthy();
    expect(
      within(screen.getByRole("group", { name: "Carte de La Réunion" })).getByRole(
        "button",
        { name: "Saint-Paul" },
      ),
    ).toBeTruthy();
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
      "scale(1.197",
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

  it("zooms smoothly with small trackpad pinch deltas without hijacking scroll", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Les plus grandes communes de France/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Sur une carte/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const map = screen.getByRole("group", {
      name: "Carte des communes françaises",
    });
    const mapContent = () => map.querySelector("g")?.getAttribute("transform");
    const marker = within(map).getAllByRole("button")[0];
    if (!marker) throw new Error("Aucun point de ville n’est visible.");
    const markerPath = marker.getAttribute("d");

    const regularScrollEvent = createEvent.wheel(map, {
      deltaY: -10,
      cancelable: true,
    });
    let regularScrollAllowed = false;
    act(() => {
      regularScrollAllowed = map.dispatchEvent(regularScrollEvent);
    });
    expect(regularScrollAllowed).toBe(true);
    expect(mapContent()).toContain("scale(1)");

    const pinchInEvent = createEvent.wheel(map, {
      ctrlKey: true,
      deltaY: -2,
      clientX: 220,
      clientY: 180,
      cancelable: true,
    });
    let pinchScrollAllowed = true;
    act(() => {
      pinchScrollAllowed = map.dispatchEvent(pinchInEvent);
    });
    expect(pinchScrollAllowed).toBe(false);
    expect(pinchInEvent.defaultPrevented).toBe(true);
    expect(mapContent()).toContain("scale(1.040");
    expect(marker.getAttribute("d")).toBe(markerPath);
    expect(marker.getAttribute("transform")).toContain("scale(0.960789");
    fireEvent.wheel(map, {
      ctrlKey: true,
      deltaY: 1,
      clientX: 220,
      clientY: 180,
    });
    expect(mapContent()).toContain("scale(1.020");
    expect(marker.getAttribute("transform")).toContain("scale(0.980198");
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

  it("maps English counties to their seats and county seats back to counties", () => {
    render(<GeoLearner email="owner@example.com" geography={geography} />);

    fireEvent.click(
      screen.getByRole("button", { name: /Les counties anglais/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Sur une carte/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const countyPrompt =
      screen.getByRole("heading", { level: 2 }).textContent ?? "";
    const county = geography.englandCounties.find(
      ({ name, seat }) =>
        countyPrompt ===
        `Repère ${seat}, le chef-lieu traditionnel du county ${name}, sur la carte.`,
    );
    if (!county) throw new Error("La question county/chef-lieu est introuvable.");
    const countyMap = screen.getByRole("group", {
      name: "Carte des counties anglais",
    });
    expect(within(countyMap).getAllByRole("button", { name: county.seat }).length)
      .toBeGreaterThan(0);
    fireEvent.click(within(countyMap).getAllByRole("button", { name: county.seat })[0]);
    expect(screen.getByRole("status").textContent).toContain("Bonne réponse");

    fireEvent.click(screen.getByRole("button", { name: "Retour aux quiz" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: /Les chefs-lieux des counties anglais/,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Sur une carte/ }));
    fireEvent.click(screen.getByRole("button", { name: "Démarrer le quiz" }));

    const seatPrompt =
      screen.getByRole("heading", { level: 2 }).textContent ?? "";
    const countySeat = geography.englandCounties.find(({ seat }) =>
      seatPrompt.startsWith(`${seat} est le chef-lieu traditionnel`),
    );
    if (!countySeat) throw new Error("La question chef-lieu/county est introuvable.");
    const seatMap = screen.getByRole("group", {
      name: "Carte des counties anglais",
    });
    fireEvent.click(
      within(seatMap).getByRole("button", { name: countySeat.name }),
    );
    expect(screen.getByRole("status").textContent).toContain("Bonne réponse");
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
    expect(screen.getAllByText(/Réponse attendue :/).length).toBe(48);
    expect(screen.getByText("Ton score : 0 / 48")).toBeTruthy();
    expect(
      JSON.parse(
        localStorage.getItem("geolearner:completed-attempts:v1") ?? "[]",
      )[0].score,
    ).toBe("0/48");
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
