"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { QuizCategoryId } from "@/lib/quiz-engine";
import departments from "@/data/maps/french-departments.json";
import regions from "@/data/maps/french-regions.json";
import countries from "@/data/maps/world-countries.json";
import englandCounties from "@/data/maps/england-counties.json";
import quizMapPoints from "@/data/maps/quiz-map-points.json";
import {
  createMapProjection,
  projectMapPosition,
  type MapPosition,
} from "@/lib/map-projection";
import styles from "../page.module.css";

type Polygon = MapPosition[][];
type MapGeometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: Polygon[] }
  | { type: "Point"; coordinates: MapPosition };
type MapFeature = {
  type: "Feature";
  properties: {
    code: string;
    name: string;
    regionCode?: string;
    departmentCode?: string;
  };
  geometry: MapGeometry;
  selectable?: boolean;
};
type PointFeatureData = {
  properties: MapFeature["properties"];
  geometry: { coordinates: number[] };
};
type MapView = { zoom: number; panX: number; panY: number };
type DragStart = {
  x: number;
  y: number;
  panX: number;
  panY: number;
  zoom: number;
};

const maximumZoom = 12;
const maximumWheelZoomStep = 0.18;

const departmentFeatures = departments.features as MapFeature[];
const regionFeatures = regions.features as MapFeature[];
const countryFeatures = countries.features as MapFeature[];
const countyFeatures = englandCounties.features as MapFeature[];
const overseasFeatureCodes = new Set(["971", "972", "973", "974", "976"]);
const metropolitanDepartmentFeatures = departmentFeatures.filter(
  (feature) => !overseasFeatureCodes.has(feature.properties.code),
);

function normalizePointFeatures(features: PointFeatureData[]): MapFeature[] {
  return features.map(({ properties, geometry }) => {
    const [longitude, latitude] = geometry.coordinates;
    if (typeof longitude !== "number" || typeof latitude !== "number") {
      throw new Error(`Coordonnées de carte invalides pour ${properties.name}.`);
    }

    const coordinates: MapPosition = [longitude, latitude];
    return {
      type: "Feature",
      properties,
      geometry: { type: "Point", coordinates },
    };
  });
}

const frenchFeatures = {
  departments: departmentFeatures,
  prefectures: departmentFeatures,
  regions: regionFeatures,
} as const;
const pointFeatures: Partial<Record<QuizCategoryId, MapFeature[]>> = {
  "french-cities": normalizePointFeatures(quizMapPoints.frenchCities),
  "region-cities": normalizePointFeatures(quizMapPoints.regionCities),
  "occitanie-cities": normalizePointFeatures(quizMapPoints.occitanieCities),
  "england-cities": normalizePointFeatures(quizMapPoints.englandCities),
  "england-counties": normalizePointFeatures(quizMapPoints.countySeats),
};
const mapDepartments = [...departmentFeatures].sort(
  (left, right) =>
    right.properties.code.length - left.properties.code.length,
);

function getPolygons(feature: MapFeature): Polygon[] {
  if (feature.geometry.type === "Point") return [];
  return feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
}

function getPositions(feature: MapFeature): MapPosition[] {
  if (feature.geometry.type === "Point") return [feature.geometry.coordinates];
  return getPolygons(feature).flatMap((polygon) => polygon.flat());
}

function getPointDepartment(feature: MapFeature) {
  return mapDepartments.find(({ properties }) =>
    feature.properties.code.startsWith(properties.code),
  );
}

function isMetropolitanPoint(feature: MapFeature) {
  return metropolitanDepartmentFeatures.some(({ properties }) =>
    feature.properties.code.startsWith(properties.code),
  );
}

function groupOutlyingPoints(features: MapFeature[]) {
  const groups = new Map<
    string,
    { title: string; features: MapFeature[]; department?: MapFeature }
  >();

  for (const feature of features) {
    const department = getPointDepartment(feature);
    const key = department?.properties.code ?? feature.properties.code;
    const group = groups.get(key) ?? {
      title: department?.properties.name ?? feature.properties.name,
      features: [],
      department,
    };
    group.features.push(feature);
    groups.set(key, group);
  }

  return [...groups.values()].map(({ title, features: points, department }) => ({
    title,
    features: [
      ...(department ? [{ ...department, selectable: false }] : []),
      ...points,
    ],
  }));
}

function getPath(
  feature: MapFeature,
  width: number,
  height: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  projectPosition: (position: MapPosition) => MapPosition,
): { path: string; pointCenter?: MapPosition } {
  const padding = 8;
  const scale = Math.min(
    (width - padding * 2) / (bounds.maxX - bounds.minX || 1),
    (height - padding * 2) / (bounds.maxY - bounds.minY || 1),
  );
  const drawnWidth = (bounds.maxX - bounds.minX) * scale;
  const drawnHeight = (bounds.maxY - bounds.minY) * scale;
  const offsetX = (width - drawnWidth) / 2;
  const offsetY = (height - drawnHeight) / 2;
  const project = (position: MapPosition) => {
    const [longitude, latitude] = projectPosition(position);
    return [
      offsetX + (longitude - bounds.minX) * scale,
      height - offsetY - (latitude - bounds.minY) * scale,
    ];
  };

  if (feature.geometry.type === "Point") {
    const [x, y] = project(feature.geometry.coordinates);
    const radius = 5.5;
    return {
      path: `M${x - radius},${y}a${radius},${radius} 0 1,0 ${radius * 2},0a${radius},${radius} 0 1,0 ${-radius * 2},0`,
      pointCenter: [x, y],
    };
  }

  return {
    path: getPolygons(feature)
      .flatMap((polygon) =>
        polygon.map((ring) => {
          const paths: string[] = [];
          let currentPath = "";
          let previousLongitude: number | null = null;

          for (const position of ring) {
            const [longitude] = position;
            if (
              previousLongitude !== null &&
              Math.abs(longitude - previousLongitude) > 180
            ) {
              if (currentPath) paths.push(`${currentPath}Z`);
              currentPath = "";
            }

            const [x, y] = project(position);
            currentPath += `${currentPath ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
            previousLongitude = longitude;
          }

          if (currentPath) paths.push(`${currentPath}Z`);
          return paths.join("");
        }),
      )
      .join(""),
  };
}

function MapCanvas({
  features,
  selectedAnswer,
  correctAnswer,
  acceptedAnswers = [],
  revealCorrectAnswer = false,
  disabled,
  onAnswer,
  label,
  width = 720,
  height = 450,
}: {
  features: MapFeature[];
  selectedAnswer: string | null;
  correctAnswer: string;
  acceptedAnswers?: string[];
  revealCorrectAnswer?: boolean;
  disabled: boolean;
  onAnswer: (answer: string) => void;
  label: string;
  width?: number;
  height?: number;
}) {
  const [mapView, setMapView] = useState<MapView>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });
  const [dragStart, setDragStart] = useState<DragStart | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const preparedFeatures = useMemo(() => {
    const coordinates = features.flatMap((feature) =>
      getPositions(feature),
    );
    const projection = createMapProjection(coordinates);
    const projectedCoordinates = coordinates.map((position) =>
      projectMapPosition(position, projection),
    );
    const bounds = projectedCoordinates.reduce(
      (result, [longitude, latitude]) => ({
        minX: Math.min(result.minX, longitude),
        maxX: Math.max(result.maxX, longitude),
        minY: Math.min(result.minY, latitude),
        maxY: Math.max(result.maxY, latitude),
      }),
      {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      },
    );

    return features.map((feature, index) => {
      const { path, pointCenter } = getPath(
        feature,
        width,
        height,
        bounds,
        (position) => projectMapPosition(position, projection),
      );
      return {
        feature,
        key: `${feature.properties.code}-${index}`,
        path,
        pointCenter,
      };
    });
  }, [features, height, width]);

  useEffect(() => {
    if (!dragStart) return;

    const moveMap = (event: MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const deltaX = ((event.clientX - dragStart.x) * width) / (rect.width || 1);
      const deltaY = ((event.clientY - dragStart.y) * height) / (rect.height || 1);
      const maxPanX = (width * (dragStart.zoom - 1)) / 2;
      const maxPanY = (height * (dragStart.zoom - 1)) / 2;

      setMapView((current) => ({
        ...current,
        panX: Math.max(-maxPanX, Math.min(maxPanX, dragStart.panX + deltaX)),
        panY: Math.max(-maxPanY, Math.min(maxPanY, dragStart.panY + deltaY)),
      }));
    };
    const stopDragging = () => setDragStart(null);

    window.addEventListener("mousemove", moveMap);
    window.addEventListener("mouseup", stopDragging);
    return () => {
      window.removeEventListener("mousemove", moveMap);
      window.removeEventListener("mouseup", stopDragging);
    };
  }, [dragStart, height, width]);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      event.stopPropagation();

      const deltaMultiplier =
        event.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? 16
          : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? svg.clientHeight || height
            : 1;
      const zoomStep = Math.max(
        -maximumWheelZoomStep,
        Math.min(
          maximumWheelZoomStep,
          -event.deltaY * deltaMultiplier * 0.02,
        ),
      );

      if (zoomStep === 0) return;

      const rect = svg.getBoundingClientRect();
      const cursorX =
        rect.width > 0
          ? ((event.clientX - rect.left) * width) / rect.width
          : width / 2;
      const cursorY =
        rect.height > 0
          ? ((event.clientY - rect.top) * height) / rect.height
          : height / 2;

      setMapView((current) => {
        const zoom = Math.max(
          1,
          Math.min(maximumZoom, current.zoom * Math.exp(zoomStep)),
        );
        const zoomRatio = zoom / current.zoom;
        const panX =
          (cursorX - width / 2) * (1 - zoomRatio) + current.panX * zoomRatio;
        const panY =
          (cursorY - height / 2) * (1 - zoomRatio) + current.panY * zoomRatio;
        const maxPanX = (width * (zoom - 1)) / 2;
        const maxPanY = (height * (zoom - 1)) / 2;

        return {
          zoom,
          panX: zoom === 1 ? 0 : Math.max(-maxPanX, Math.min(maxPanX, panX)),
          panY: zoom === 1 ? 0 : Math.max(-maxPanY, Math.min(maxPanY, panY)),
        };
      });
    };

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [height, width]);

  return (
    <svg
      aria-label={label}
      className={`${styles.quizMapCanvas} ${mapView.zoom > 1 ? styles.quizMapZoomed : ""}`}
      preserveAspectRatio="xMidYMid meet"
      ref={svgRef}
      role="group"
      onContextMenu={(event) => event.preventDefault()}
      onMouseDown={(event) => {
        if (event.button !== 2 || mapView.zoom <= 1) return;
        event.preventDefault();
        setDragStart({
          x: event.clientX,
          y: event.clientY,
          panX: mapView.panX,
          panY: mapView.panY,
          zoom: mapView.zoom,
        });
      }}
      viewBox={`0 0 ${width} ${height}`}
    >
      <g
        transform={`translate(${width / 2 + mapView.panX} ${height / 2 + mapView.panY}) scale(${mapView.zoom}) translate(${-width / 2} ${-height / 2})`}
      >
        {preparedFeatures.map(({ feature, path, key, pointCenter }) => {
          const selectable = feature.selectable !== false;
          const isPoint = feature.geometry.type === "Point";
          const isSelected =
            selectable && selectedAnswer === feature.properties.name;
          const isCorrectAnswer =
            feature.properties.name === correctAnswer ||
            acceptedAnswers.includes(feature.properties.name);
          const isRevealedAnswer =
            selectable &&
            revealCorrectAnswer &&
            isCorrectAnswer &&
            !isSelected;
          return (
            <path
              aria-label={feature.properties.name}
              aria-disabled={selectable ? disabled : undefined}
              aria-pressed={selectable ? isSelected : undefined}
              aria-hidden={selectable ? undefined : true}
              className={
                selectable
                  ? `${isPoint ? styles.quizMapCityPoint : styles.quizMapRegion} ${isSelected ? styles.quizMapRegionSelected : ""} ${isSelected ? (isCorrectAnswer ? styles.quizMapRegionCorrect : styles.quizMapRegionIncorrect) : ""} ${isRevealedAnswer ? styles.quizMapRegionCorrect : ""}`
                  : styles.quizMapBackground
              }
              d={path}
              key={key}
              transform={
                pointCenter
                  ? `translate(${pointCenter[0]} ${pointCenter[1]}) scale(${1 / mapView.zoom}) translate(${-pointCenter[0]} ${-pointCenter[1]})`
                  : undefined
              }
              onClick={
                selectable && !disabled
                  ? () => onAnswer(feature.properties.name)
                  : undefined
              }
              onKeyDown={
                selectable && !disabled
                  ? (event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onAnswer(feature.properties.name);
                      }
                    }
                  : undefined
              }
              role={selectable ? "button" : undefined}
              tabIndex={!selectable || disabled ? -1 : 0}
            />
          );
        })}
      </g>
    </svg>
  );
}

export default function QuizMap({
  category,
  areaCode,
  quizAnswers,
  selectedAnswer,
  correctAnswer,
  acceptedAnswers = [],
  revealCorrectAnswer = false,
  disabled,
  onAnswer,
}: {
  category: QuizCategoryId;
  areaCode?: string;
  quizAnswers: string[];
  selectedAnswer: string | null;
  correctAnswer: string;
  acceptedAnswers?: string[];
  revealCorrectAnswer?: boolean;
  disabled: boolean;
  onAnswer: (answer: string) => void;
}) {
  const isDepartmentMap =
    category === "departments" || category === "prefectures";
  const { isFrance, mapFeatures, label, pointInsets } = useMemo(() => {
    const isFrenchCategory = category in frenchFeatures;
    const features = isFrenchCategory
      ? frenchFeatures[category as keyof typeof frenchFeatures]
      : category === "england-seats"
        ? countyFeatures
        : countryFeatures;
    const answerSet = new Set(quizAnswers);
    const relatedPoints = (pointFeatures[category] ?? []).filter(
      (feature) =>
        answerSet.has(feature.properties.name) &&
        (!areaCode ||
          feature.properties.regionCode === areaCode ||
          feature.properties.departmentCode === areaCode),
    );
    const usesPointMap =
      category === "french-cities" ||
      category === "region-cities" ||
      category === "occitanie-cities" ||
      category === "england-cities" ||
      category === "england-counties";
    const isFrenchPointMap =
      category === "french-cities" ||
      category === "region-cities" ||
      category === "occitanie-cities";
    const metropolitanPoints =
      category === "french-cities"
        ? relatedPoints.filter(isMetropolitanPoint)
        : relatedPoints;
    const pointInsets =
      category === "french-cities"
        ? groupOutlyingPoints(relatedPoints.filter((point) => !isMetropolitanPoint(point)))
        : [];
    const contextFeatures =
      category === "england-cities" || category === "england-counties"
        ? countyFeatures
        : category === "french-cities"
          ? metropolitanDepartmentFeatures
          : category === "region-cities"
            ? regionFeatures.filter(
                (feature) => feature.properties.code === areaCode,
              )
            : category === "occitanie-cities"
              ? departmentFeatures.filter(
                  (feature) => feature.properties.code === areaCode,
                )
              : [];
    const selectableFeatures = usesPointMap
      ? category === "french-cities"
        ? metropolitanPoints
        : relatedPoints
      : features.map((feature) => ({ ...feature, selectable: true }));
    const mapFeatures = [
      ...contextFeatures.map((feature) => ({
        ...feature,
        selectable: false,
      })),
      ...selectableFeatures,
    ];
    const label = isDepartmentMap
      ? "Carte des départements métropolitains"
      : category === "regions"
        ? "Carte des régions métropolitaines"
        : category === "england-counties" || category === "england-cities"
          ? "Carte des counties anglais"
          : category === "england-seats"
            ? "Carte des counties anglais"
            : category === "world-area" || category === "world-population"
              ? "Carte du monde"
              : "Carte des communes françaises";

    return {
      isFrance: isFrenchCategory || isFrenchPointMap,
      mapFeatures,
      label,
      pointInsets,
    };
  }, [areaCode, category, isDepartmentMap, quizAnswers]);

  const overseasFeatures =
    isFrance && (category === "departments" || category === "prefectures")
      ? departmentFeatures.filter((feature) =>
          overseasFeatureCodes.has(feature.properties.code),
        )
      : isFrance && category === "regions"
        ? regionFeatures.filter((feature) =>
            Number(feature.properties.code) < 10,
          )
        : [];
  const mainFeatures =
    overseasFeatures.length > 0
      ? mapFeatures.filter(
          (feature) =>
            feature.selectable === false ||
            !overseasFeatures.some(
              ({ properties }) => properties.code === feature.properties.code,
            ),
        )
      : mapFeatures;
  return (
    <div className={styles.quizMap}>
      <p className={styles.quizMapInstructions}>
        Pince avec le trackpad ou utilise Ctrl + molette pour zoomer, puis clic
        droit + glisser pour déplacer. Le zoom de la page est bloqué pendant le
        geste sur la carte.
      </p>
      <MapCanvas
        features={mainFeatures}
        height={isFrance ? 560 : 480}
        label={label}
        correctAnswer={correctAnswer}
        disabled={disabled}
        onAnswer={onAnswer}
        selectedAnswer={selectedAnswer}
        acceptedAnswers={acceptedAnswers}
        revealCorrectAnswer={revealCorrectAnswer}
      />
      {overseasFeatures.length > 0 && (
        <div className={styles.quizMapInsets}>
          <h3>Outre-mer</h3>
          <div>
            {overseasFeatures.map((feature) => (
              <MapCanvas
                features={[{ ...feature, selectable: true }]}
                height={110}
                key={feature.properties.code}
                label={`Carte de ${feature.properties.name}`}
                correctAnswer={correctAnswer}
                disabled={disabled}
                onAnswer={onAnswer}
                selectedAnswer={selectedAnswer}
                acceptedAnswers={acceptedAnswers}
                revealCorrectAnswer={revealCorrectAnswer}
                width={170}
              />
            ))}
          </div>
        </div>
      )}
      {pointInsets.length > 0 && (
        <div className={styles.quizMapInsets}>
          <h3>Outre-mer</h3>
          <div>
            {pointInsets.map(({ title, features }) => (
              <section key={title}>
                <h4>{title}</h4>
                <MapCanvas
                  features={features}
                  height={170}
                  key={title}
                  label={`Carte de ${title}`}
                  correctAnswer={correctAnswer}
                  disabled={disabled}
                  onAnswer={onAnswer}
                  selectedAnswer={selectedAnswer}
                  acceptedAnswers={acceptedAnswers}
                  width={230}
                />
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
