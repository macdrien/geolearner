import { describe, expect, it } from "vitest";
import geography from "../../src/data/geography.json";
import departments from "../../src/data/maps/french-departments.json";
import regions from "../../src/data/maps/french-regions.json";
import countries from "../../src/data/maps/world-countries.json";

describe("offline quiz maps", () => {
  it("includes a boundary for every French department and region", () => {
    const departmentNames = new Set(
      departments.features.map(({ properties }) => properties.name),
    );
    const regionNames = new Set(
      regions.features.map(({ properties }) => properties.name),
    );

    expect(departments.features).toHaveLength(geography.departments.length);
    expect(regions.features).toHaveLength(geography.frenchRegions.length);
    expect(
      geography.departments.every(({ name }) => departmentNames.has(name)),
    ).toBe(true);
    expect(
      geography.frenchRegions.every(({ name }) => regionNames.has(name)),
    ).toBe(true);
  });

  it("includes every country used by the population and area quizzes", () => {
    const countryNames = new Set(
      countries.features.map(({ properties }) => properties.name),
    );
    const quizCountryNames = [
      ...geography.worldPopulation,
      ...geography.worldArea,
    ].map(({ name }) => name);

    expect(quizCountryNames.every((name) => countryNames.has(name))).toBe(true);
    expect(new Set(countries.features.map(({ properties }) => properties.code)).size)
      .toBe(countries.features.length);
  });
});
