import { describe, expect, it } from "vitest";
import geography from "../../src/data/geography.json";
import {
  buildQuiz,
  getAvailableQuizSizes,
  getAvailableQuizFormats,
  getQuizQuestionCount,
  getSelectedQuizSize,
  isQuizAnswerCorrect,
  normalizeQuizAnswer,
} from "../../src/lib/quiz-engine";

describe("geography quiz engine", () => {
  it("builds exhaustive department and prefecture quizzes, including overseas", () => {
    const departments = buildQuiz(
      geography,
      { category: "departments" },
      () => 0.5,
    );
    const prefectures = buildQuiz(
      geography,
      { category: "prefectures" },
      () => 0.5,
    );

    expect(departments).toHaveLength(101);
    expect(prefectures).toHaveLength(101);
    expect(departments.map(({ answer }) => answer)).toContain("Guadeloupe");
    expect(departments.map(({ answer }) => answer)).toContain("Mayotte");
    expect(prefectures.map(({ answer }) => answer)).toContain("Cayenne");
  });

  it("uses the selected department identifier in map quiz prompts", () => {
    const classic = buildQuiz(
      geography,
      { category: "departments" },
      () => 0.5,
    );
    const mapQuiz = buildQuiz(
      geography,
      { category: "departments", format: "map" },
      () => 0.5,
    );
    const ainMapQuestion = mapQuiz.find(({ answer }) => answer === "Ain");
    const ainClassicQuestion = classic.find(({ answer }) => answer === "Ain");

    expect(ainMapQuestion?.prompt).toBe(
      "Place le département Ain sur la carte.",
    );
    expect(ainClassicQuestion?.prompt).toContain(
      "la préfecture de Bourg-en-Bresse",
    );
    expect(
      buildQuiz(
        geography,
        {
          category: "departments",
          format: "map",
          mapIdentification: "code",
        },
        () => 0.5,
      ).find(({ answer }) => answer === "Ain")?.prompt,
    ).toBe("Place le département 01 sur la carte.");
  });

  it("maps prefectures to their department boundaries", () => {
    const quiz = buildQuiz(
      geography,
      { category: "prefectures", format: "map" },
      () => 0.5,
    );

    expect(quiz).toHaveLength(101);
    expect(
      quiz.find(({ prompt }) =>
        prompt.includes("la préfecture est Bourg-en-Bresse"),
      ),
    ).toEqual({
      prompt:
        "Place le département dont la préfecture est Bourg-en-Bresse sur la carte.",
      answer: "Ain",
      choices: expect.any(Array),
    });
  });

  it("covers counties and their distinct traditional county seats", () => {
    const counties = buildQuiz(
      geography,
      { category: "england-counties" },
      () => 0.5,
    );
    const seats = buildQuiz(
      geography,
      { category: "england-seats" },
      () => 0.5,
    );

    expect(counties).toHaveLength(48);
    expect(
      counties.find(({ prompt }) => prompt.includes("county de Bedfordshire"))
        ?.answer,
    ).toBe("Bedford");
    expect(seats).toHaveLength(47);
    expect(
      seats.find(({ prompt }) => prompt.startsWith("London"))?.answer,
    ).toBe("City of London et Greater London");

    const mapSeats = buildQuiz(
      geography,
      { category: "england-seats", format: "map" },
      () => 0.5,
    );
    const londonMapQuestion = mapSeats.find(({ prompt }) =>
      prompt.startsWith("London"),
    );
    if (!londonMapQuestion) throw new Error("La question de Londres est absente.");
    expect(mapSeats).toHaveLength(47);
    expect(londonMapQuestion.answer).toBe("City of London");
    expect(londonMapQuestion.acceptedAnswers).toEqual([
      "City of London",
      "Greater London",
    ]);
    expect(isQuizAnswerCorrect(londonMapQuestion, "Greater London")).toBe(true);
  });

  it("builds one question for each French region", () => {
    const quiz = buildQuiz(
      geography,
      { category: "regions" },
      () => 0.5,
    );

    expect(quiz).toHaveLength(18);
    expect(quiz.map(({ answer }) => answer)).toContain("Guadeloupe");
    expect(
      quiz.find(({ answer }) => answer === "Occitanie")?.prompt,
    ).toContain("Haute-Garonne");

    const mapQuiz = buildQuiz(
      geography,
      { category: "regions", format: "map" },
      () => 0.5,
    );
    expect(
      mapQuiz.find(({ answer }) => answer === "Occitanie")?.prompt,
    ).toBe("Place la région Occitanie sur la carte.");
  });

  it("uses a direct place name for ranked map quiz prompts", () => {
    const mapQuiz = buildQuiz(
      geography,
      { category: "world-population", format: "map", size: 10 },
      () => 0.5,
    );

    expect(mapQuiz[0].prompt).toBe(
      `Trouve ${mapQuiz[0].answer} sur la carte.`,
    );
  });

  it("offers classic, typed, and map answers for every quiz", () => {
    expect(getAvailableQuizFormats("departments")).toEqual([
      "classic",
      "list",
      "map",
    ]);
    const mapQuizRequests = [
      ["departments", undefined],
      ["prefectures", undefined],
      ["regions", undefined],
      ["french-cities", undefined],
      ["england-counties", undefined],
      ["england-seats", undefined],
      ["england-cities", undefined],
      ["world-population", undefined],
      ["world-area", undefined],
      ["region-cities", "11"],
      ["occitanie-cities", "31"],
    ] as const;

    for (const [category, areaCode] of mapQuizRequests) {
      expect(getAvailableQuizFormats(category)).toContain("map");
      expect(
        buildQuiz(
          geography,
          { category, areaCode, format: "map" },
          () => 0.5,
        ).length,
      ).toBeGreaterThan(0);
    }
  });

  it("normalizes accents, case, and extra spaces in typed answers", () => {
    expect(normalizeQuizAnswer("  SAINT-Étienne  ")).toBe("saint-etienne");
    expect(normalizeQuizAnswer("Île-de-France")).toBe("ile-de-france");
  });

  it.each([10, 50, 100] as const)(
    "builds all ranking variants with %i questions",
    (size) => {
      const variants = [
        ["french-cities", undefined],
        ["england-cities", undefined],
        ["world-population", undefined],
        ["world-area", undefined],
        ["region-cities", "11"],
        ["occitanie-cities", "31"],
      ] as const;

      for (const [category, areaCode] of variants) {
        const quiz = buildQuiz(
          geography,
          { category, size, areaCode },
          () => 0.5,
        );

        expect(quiz).toHaveLength(size);
        expect(
          quiz.every(
            ({ choices, answer }) =>
              choices.length === 4 && choices.includes(answer),
          ),
        ).toBe(true);
      }
    },
  );

  it("rejects missing regional selections instead of producing an empty quiz", () => {
    expect(() =>
      buildQuiz(geography, { category: "region-cities" }, () => 0.5),
    ).toThrow("Sélectionne une région française valide.");
  });

  it("offers every available commune when an overseas region has fewer than 100", () => {
    expect(
      getAvailableQuizSizes(geography, "region-cities", "01"),
    ).toEqual([10, 32]);
    expect(
      buildQuiz(
        geography,
        { category: "region-cities", areaCode: "01", size: 32 },
        () => 0.5,
      ),
    ).toHaveLength(32);
  });

  it("shares accurate question counts and selected-size fallbacks", () => {
    expect(getQuizQuestionCount(geography, "england-counties")).toBe(48);
    expect(getQuizQuestionCount(geography, "england-seats")).toBe(47);
    expect(getQuizQuestionCount(geography, "regions")).toBe(18);
    expect(
      getSelectedQuizSize(geography, "region-cities", 100, "01"),
    ).toBe(32);
  });
});
