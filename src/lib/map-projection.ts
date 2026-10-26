export type MapPosition = [longitude: number, latitude: number];

export type MapProjection =
  | { type: "local"; longitudeScale: number }
  | { type: "mollweide" };

export function createMapProjection(
  positions: MapPosition[],
): MapProjection {
  const bounds = positions.reduce(
    (result, [longitude, latitude]) => ({
      minLongitude: Math.min(result.minLongitude, longitude),
      maxLongitude: Math.max(result.maxLongitude, longitude),
      minLatitude: Math.min(result.minLatitude, latitude),
      maxLatitude: Math.max(result.maxLatitude, latitude),
    }),
    {
      minLongitude: Number.POSITIVE_INFINITY,
      maxLongitude: Number.NEGATIVE_INFINITY,
      minLatitude: Number.POSITIVE_INFINITY,
      maxLatitude: Number.NEGATIVE_INFINITY,
    },
  );
  const longitudeSpan = bounds.maxLongitude - bounds.minLongitude;

  if (longitudeSpan > 180) return { type: "mollweide" };

  const centerLatitude =
    ((bounds.minLatitude + bounds.maxLatitude) / 2) * (Math.PI / 180);
  return {
    type: "local",
    longitudeScale: Math.cos(centerLatitude),
  };
}

export function projectMapPosition(
  [longitude, latitude]: MapPosition,
  projection: MapProjection,
): MapPosition {
  if (projection.type === "local") {
    return [longitude * projection.longitudeScale, latitude];
  }

  const longitudeRadians = longitude * (Math.PI / 180);
  const latitudeRadians = latitude * (Math.PI / 180);
  let theta = latitudeRadians;

  if (Math.abs(Math.abs(latitudeRadians) - Math.PI / 2) < 1e-8) {
    theta = Math.sign(latitudeRadians) * (Math.PI / 2);
  } else {
    for (let iteration = 0; iteration < 10; iteration += 1) {
      const denominator = 2 + 2 * Math.cos(2 * theta);
      const adjustment =
        (2 * theta + Math.sin(2 * theta) -
          Math.PI * Math.sin(latitudeRadians)) /
        denominator;
      theta -= adjustment;
      if (Math.abs(adjustment) < 1e-10) break;
    }
  }

  return [
    (2 * Math.SQRT2 * longitudeRadians * Math.cos(theta)) / Math.PI,
    Math.SQRT2 * Math.sin(theta),
  ];
}
