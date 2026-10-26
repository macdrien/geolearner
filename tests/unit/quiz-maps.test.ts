import { describe, expect, it } from "vitest";
import geography from "../../src/data/geography.json";
import departments from "../../src/data/maps/french-departments.json";
import regions from "../../src/data/maps/french-regions.json";
import countries from "../../src/data/maps/world-countries.json";
import englandCounties from "../../src/data/maps/england-counties.json";
import quizMapPoints from "../../src/data/maps/quiz-map-points.json";

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

  it("includes every county and county seat used by the English quizzes", () => {
    const countyNames = new Set(
      englandCounties.features.map(({ properties }) => properties.name),
    );
    const seatNames = new Set(
      quizMapPoints.countySeats.map(({ properties }) => properties.name),
    );

    expect(englandCounties.features).toHaveLength(48);
    expect(
      geography.englandCounties.every(({ name }) => countyNames.has(name)),
    ).toBe(true);
    expect(
      geography.englandCounties.every(({ seat }) => seatNames.has(seat)),
    ).toBe(true);
    expect(
      geography.englandCities.every(({ name }) =>
        quizMapPoints.englandCities.some(
          ({ properties }) => properties.name === name,
        ),
      ),
    ).toBe(true);
  });

  it("includes a selectable point for every ranked French city in its selected area", () => {
    expect(
      geography.frenchCities.every(({ name }) =>
        quizMapPoints.frenchCities.some(
          ({ properties }) => properties.name === name,
        ),
      ),
    ).toBe(true);

    for (const region of geography.frenchRegions) {
      const regionCities = quizMapPoints.regionCities.filter(
        ({ properties }) => properties.regionCode === region.code,
      );
      expect(
        region.communes.every(({ name }) =>
          regionCities.some(({ properties }) => properties.name === name),
        ),
      ).toBe(true);
    }

    for (const department of geography.occitanieDepartments) {
      const departmentCities = quizMapPoints.occitanieCities.filter(
        ({ properties }) => properties.departmentCode === department.code,
      );
      expect(
        department.communes.every(({ name }) =>
          departmentCities.some(({ properties }) => properties.name === name),
        ),
      ).toBe(true);
    }
  });
});
