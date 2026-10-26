"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type WheelEvent as ReactWheelEvent,
} from "react";
import type { QuizCategoryId } from "@/lib/quiz-engine";
import departments from "@/data/maps/french-departments.json";
import regions from "@/data/maps/french-regions.json";
import countries from "@/data/maps/world-countries.json";
import {
  createMapProjection,
  projectMapPosition,
  type MapPosition,
} from "@/lib/map-projection";
import styles from "../page.module.css";

type Polygon = MapPosition[][];
type MapGeometry =
  | { type: "Polygon"; coordinates: Polygon }
  | { type: "MultiPolygon"; coordinates: Polygon[] };
type MapFeature = {
  type: "Feature";
  properties: { code: string; name: string };
  geometry: MapGeometry;
};
type MapView = { zoom: number; panX: number; panY: number };
type DragStart = {
  x: number;
  y: number;
  panX: number;
  panY: number;
  zoom: number;
};

const departmentFeatures = departments.features as MapFeature[];
const regionFeatures = regions.features as MapFeature[];
const countryFeatures = countries.features as MapFeature[];
const frenchFeatures = {
  departments: departmentFeatures,
  prefectures: departmentFeatures,
  regions: regionFeatures,
} as const;
const overseasFeatureCodes = new Set(["971", "972", "973", "974", "976"]);

function getPolygons(feature: MapFeature): Polygon[] {
  return feature.geometry.type === "Polygon"
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
}

function getPath(
  feature: MapFeature,
  width: number,
  height: number,
  bounds: { minX: number; maxX: number; minY: number; maxY: number },
  projectPosition: (position: MapPosition) => MapPosition,
) {
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

  return getPolygons(feature)
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
    .join("");
}

function MapCanvas({
  features,
  selectedAnswer,
  correctAnswer,
  disabled,
  onAnswer,
  label,
  width = 720,
  height = 450,
}: {
  features: MapFeature[];
  selectedAnswer: string | null;
  correctAnswer: string;
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
      getPolygons(feature).flatMap((polygon) => polygon.flat()),
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

    return features.map((feature) => ({
      feature,
      path: getPath(
        feature,
        width,
        height,
        bounds,
        (position) => projectMapPosition(position, projection),
      ),
    }));
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

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    if (!event.ctrlKey) return;
    event.preventDefault();
    setMapView((current) => {
      const zoom = Math.max(
        1,
        Math.min(8, current.zoom * Math.exp(-event.deltaY * 0.002)),
      );
      return {
        zoom,
        panX: zoom === 1 ? 0 : current.panX,
        panY: zoom === 1 ? 0 : current.panY,
      };
    });
  }

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
      onWheel={handleWheel}
      viewBox={`0 0 ${width} ${height}`}
    >
      <g
        transform={`translate(${width / 2 + mapView.panX} ${height / 2 + mapView.panY}) scale(${mapView.zoom}) translate(${-width / 2} ${-height / 2})`}
      >
        {preparedFeatures.map(({ feature, path }) => {
          const isSelected = selectedAnswer === feature.properties.name;
          return (
            <path
              aria-label={feature.properties.name}
              aria-disabled={disabled}
              aria-pressed={isSelected}
              className={`${styles.quizMapRegion} ${isSelected ? styles.quizMapRegionSelected : ""} ${isSelected ? (feature.properties.name === correctAnswer ? styles.quizMapRegionCorrect : styles.quizMapRegionIncorrect) : ""}`}
              d={path}
              key={feature.properties.code}
              onClick={() => {
                if (!disabled) onAnswer(feature.properties.name);
              }}
              onKeyDown={(event) => {
                if (!disabled && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  onAnswer(feature.properties.name);
                }
              }}
              role="button"
              tabIndex={disabled ? -1 : 0}
            />
          );
        })}
      </g>
    </svg>
  );
}

export default function QuizMap({
  category,
  selectedAnswer,
  correctAnswer,
  disabled,
  onAnswer,
}: {
  category: QuizCategoryId;
  selectedAnswer: string | null;
  correctAnswer: string;
  disabled: boolean;
  onAnswer: (answer: string) => void;
}) {
  const isDepartmentMap =
    category === "departments" || category === "prefectures";
  const { isFrance, mainFeatures, overseasFeatures } = useMemo(() => {
    const isFrenchCategory = category in frenchFeatures;
    const selectedFeatures = isFrenchCategory
      ? frenchFeatures[category as keyof typeof frenchFeatures]
      : countryFeatures;
    const isOverseasFeature = (feature: MapFeature) =>
      isDepartmentMap
        ? overseasFeatureCodes.has(feature.properties.code)
        : Number(feature.properties.code) < 10;
    const main = isFrenchCategory
      ? selectedFeatures.filter((feature) => !isOverseasFeature(feature))
      : selectedFeatures;

    return {
      isFrance: isFrenchCategory,
      mainFeatures: main,
      overseasFeatures: isFrenchCategory
        ? selectedFeatures.filter(isOverseasFeature)
        : [],
    };
  }, [category, isDepartmentMap]);

  return (
    <div className={styles.quizMap}>
      <p className={styles.quizMapInstructions}>
        Ctrl + molette pour zoomer, puis clic droit + glisser pour déplacer.
      </p>
      <MapCanvas
        features={mainFeatures}
        height={isFrance ? 560 : 480}
        label={
          isDepartmentMap
            ? "Carte des départements métropolitains"
            : category === "regions"
              ? "Carte des régions métropolitaines"
              : "Carte du monde"
        }
        correctAnswer={correctAnswer}
        disabled={disabled}
        onAnswer={onAnswer}
        selectedAnswer={selectedAnswer}
      />
      {overseasFeatures.length > 0 && (
        <div className={styles.quizMapInsets}>
          <h3>Outre-mer</h3>
          <div>
            {overseasFeatures.map((feature) => (
              <MapCanvas
                features={[feature]}
                height={110}
                key={feature.properties.code}
                label={`Carte de ${feature.properties.name}`}
                correctAnswer={correctAnswer}
                disabled={disabled}
                onAnswer={onAnswer}
                selectedAnswer={selectedAnswer}
                width={170}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
