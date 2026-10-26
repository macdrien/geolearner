import { describe, expect, it } from "vitest";
import {
  createMapProjection,
  projectMapPosition,
} from "../../src/lib/map-projection";

describe("quiz map projections", () => {
  it("adjusts longitude distances for regional maps away from the equator", () => {
    const projection = createMapProjection([
      [2, 42],
      [8, 51],
    ]);

    expect(projection.type).toBe("local");
    if (projection.type !== "local") return;
    expect(projection.longitudeScale).toBeCloseTo(Math.cos((46.5 * Math.PI) / 180));
    expect(projectMapPosition([8, 46.5], projection)[0]).toBeLessThan(8);
  });

  it("uses a balanced world projection for global maps", () => {
    const projection = createMapProjection([
      [-180, -90],
      [180, 90],
    ]);

    expect(projection.type).toBe("mollweide");
    expect(projectMapPosition([0, 0], projection)[0]).toBe(0);
    expect(projectMapPosition([0, 90], projection)[1]).toBeCloseTo(
      Math.SQRT2,
    );
    expect(projectMapPosition([0, -90], projection)[1]).toBeCloseTo(
      -Math.SQRT2,
    );
  });
});
