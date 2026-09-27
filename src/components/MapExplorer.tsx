import { geoPath } from "d3-geo";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  countryFeatures,
  getConnectionColor,
  getPersonCountryName,
  projection,
  readGlobePalette,
  TEXTURE_HEIGHT,
  TEXTURE_WIDTH,
  type CountryFeature,
} from "./GlobeExplorer";
import {
  categoryColor,
  type Changemaker,
} from "@/data/changemakers";
import type { Connection } from "@/data/connections";

/* -------------------------------------------------------------------------- */
/* Geometry constants                                                        */
/* -------------------------------------------------------------------------- */

const MAP_ASPECT = TEXTURE_WIDTH / TEXTURE_HEIGHT;

// How many times further in than the fully zoomed-out fit the map may go.
const ZOOM_RANGE = 8;

/**
 * The fully zoomed-out view for a given container size. The map *fills* the
 * container rather than fitting inside it: the axis that the container is
 * shorter in always spans the whole world, and the other axis overflows the
 * world bounds. That overflow lands on the ocean backdrop rather than leaving
 * empty space below the map.
 */
function fitViewFor(
  width: number,
  height: number,
): ViewBox {
  const boxAspect =
    height > 0 ? width / height : MAP_ASPECT;

  const viewWidth =
    boxAspect > MAP_ASPECT
      ? TEXTURE_WIDTH
      : TEXTURE_HEIGHT * boxAspect;

  const viewHeight = viewWidth / boxAspect;

  return {
    width: viewWidth,
    height: viewHeight,
    x: (TEXTURE_WIDTH - viewWidth) / 2,
    y: (TEXTURE_HEIGHT - viewHeight) / 2,
  };
}

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Point = { x: number; y: number };

function clamp(
  value: number,
  min: number,
  max: number,
): number {
  return Math.min(
    Math.max(value, min),
    max,
  );
}

function lerp(
  a: number,
  b: number,
  t: number,
): number {
  return a + (b - a) * t;
}

function clampView(
  candidate: ViewBox,
  fit: ViewBox,
): ViewBox {
  // Zoom is expressed as a multiple of the fitted view, so the same gesture
  // feels the same regardless of the container's shape.
  const width = clamp(
    candidate.width,
    fit.width / ZOOM_RANGE,
    fit.width,
  );

  const height = width / (fit.width / fit.height);

  // Panning is bounded by the slack around the fitted view: once zoomed out
  // there is nothing to pan, and zooming in unlocks exactly the extra room.
  const slackX = (fit.width - width) / 2;

  const slackY = (fit.height - height) / 2;

  return {
    width,
    height,
    x: clamp(
      candidate.x,
      fit.x - slackX,
      fit.x + fit.width + slackX,
    ),
    y: clamp(
      candidate.y,
      fit.y - slackY,
      fit.y + fit.height + slackY,
    ),
  };
}

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

/* -------------------------------------------------------------------------- */
/* Precomputed country paths (static geometry, computed once)                */
/* -------------------------------------------------------------------------- */

const pathGenerator = geoPath(projection);

const countryPaths: {
  country: CountryFeature;
  d: string;
}[] = countryFeatures.features.map(
  (country) => ({
    country,
    d: pathGenerator(country) ?? "",
  }),
);

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export function FlatMapExplorer({
  people,
  connections,
  selectedId,
  focusVersion,
  resetVersion,
  networkMode = false,
  onSelect,
  onConnection,
  onFallback,
}: {
  people: Changemaker[];
  connections: Connection[];
  selectedId: string | null;
  focusVersion: number;
  resetVersion: number;
  networkMode?: boolean;
  onSelect: (id: string) => void;
  onConnection: (connection: Connection) => void;
  onFallback: () => void;
}) {
  // SVG needs no WebGL fallback; kept only so this drops into the same
  // toggle wiring as GlobeExplorer without prop-shape changes.
  void onFallback;

  const palette = useMemo(
    readGlobePalette,
    [],
  );

  const containerRef =
    useRef<HTMLDivElement | null>(null);

  const svgRef =
    useRef<SVGSVGElement | null>(null);

  // Measured so the map can fill whatever box it is given. Starts at the
  // world dimensions and is corrected by the observer on mount.
  const [box, setBox] = useState({
    width: TEXTURE_WIDTH,
    height: TEXTURE_HEIGHT,
  });

  const fit = useMemo(
    () => fitViewFor(box.width, box.height),
    [box.width, box.height],
  );

  const fitRef = useRef(fit);

  useEffect(() => {
    fitRef.current = fit;
  }, [fit]);

  useEffect(() => {
    const node = containerRef.current;

    if (!node) return;

    const measure = () => {
      const rect = node.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      setBox((current) =>
        current.width === rect.width &&
        current.height === rect.height
          ? current
          : { width: rect.width, height: rect.height },
      );
    };

    measure();

    const observer = new ResizeObserver(measure);

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  const [view, setView] = useState<ViewBox>(() =>
    fitViewFor(TEXTURE_WIDTH, TEXTURE_HEIGHT),
  );

  // Map units covered by one screen pixel at the current zoom. Marker geometry
  // is sized through this so a dot is a constant size on screen no matter how
  // far the map is zoomed — otherwise a map-unit radius scales with the viewBox
  // and the dots visibly grow and shrink while scrolling.
  const unitsPerPixel = box.width > 0
    ? view.width / box.width
    : 1;

  const [isDragging, setIsDragging] =
    useState(false);

  // True from the moment a pan/zoom/pinch starts until it has been quiet for a
  // beat. Hover highlighting is suppressed while this is set: the markers slide
  // underneath the cursor during a gesture, so without the guard each one fires
  // pointerenter/leave in turn and the dots visibly pop in and out.
  const [isInteracting, setIsInteracting] =
    useState(false);

  const interactionTimer = useRef<
    number | undefined
  >(undefined);

  const endInteraction = useCallback(() => {
    window.clearTimeout(interactionTimer.current);

    interactionTimer.current =
      window.setTimeout(() => {
        setIsInteracting(false);
      }, 140);
  }, []);

  const startInteraction = useCallback(() => {
    window.clearTimeout(interactionTimer.current);

    setIsInteracting(true);
  }, []);

  useEffect(
    () => () =>
      window.clearTimeout(
        interactionTimer.current,
      ),
    [],
  );

  const hoverEnabled = !isInteracting;

  const [hoveredCountry, setHoveredCountry] =
    useState<CountryFeature | null>(null);

  const [hoveredMarkerId, setHoveredMarkerId] =
    useState<string | null>(null);

  const [reducedMotion, setReducedMotion] =
    useState(false);

  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    setReducedMotion(media.matches);

    const listener = (
      event: MediaQueryListEvent,
    ) => {
      setReducedMotion(event.matches);
    };

    media.addEventListener(
      "change",
      listener,
    );

    return () =>
      media.removeEventListener(
        "change",
        listener,
      );
  }, []);

  const reducedMotionRef = useRef(reducedMotion);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  /* ------------------------------------------------------------------ */
  /* Pan / zoom / pinch                                                  */
  /* ------------------------------------------------------------------ */

  const viewRef = useRef(view);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const animationFrame = useRef<number | null>(
    null,
  );

  const cancelAnimation = useCallback(() => {
    if (animationFrame.current !== null) {
      cancelAnimationFrame(
        animationFrame.current,
      );
      animationFrame.current = null;
    }
  }, []);

  const animateTo = useCallback(
    (target: ViewBox) => {
      cancelAnimation();

      const clampedTarget =
        clampView(target, fitRef.current);

      if (reducedMotionRef.current) {
        viewRef.current = clampedTarget;
        setView(clampedTarget);
        return;
      }

      let last = performance.now();

      const step = (now: number) => {
        const delta = Math.min(
          (now - last) / 1000,
          0.05,
        );

        last = now;

        const amount =
          1 - Math.exp(-4.2 * delta);

        const current = viewRef.current;

        const next: ViewBox = {
          x: lerp(
            current.x,
            clampedTarget.x,
            amount,
          ),
          y: lerp(
            current.y,
            clampedTarget.y,
            amount,
          ),
          width: lerp(
            current.width,
            clampedTarget.width,
            amount,
          ),
          height: lerp(
            current.height,
            clampedTarget.height,
            amount,
          ),
        };

        viewRef.current = next;
        setView(next);

        const done =
          Math.abs(
            next.x - clampedTarget.x,
          ) < 0.4 &&
          Math.abs(
            next.y - clampedTarget.y,
          ) < 0.4 &&
          Math.abs(
            next.width -
              clampedTarget.width,
          ) < 0.4;

        if (done) {
          viewRef.current = clampedTarget;
          setView(clampedTarget);
          animationFrame.current = null;
          return;
        }

        animationFrame.current =
          requestAnimationFrame(step);
      };

      animationFrame.current =
        requestAnimationFrame(step);
    },
    [cancelAnimation],
  );

  useEffect(
    () => cancelAnimation,
    [cancelAnimation],
  );

  const pointersRef = useRef(
    new Map<number, Point>(),
  );

  const gestureRef = useRef<{
    view: ViewBox;
    points: Map<number, Point>;
  } | null>(null);

  const beginGesture = useCallback(() => {
    gestureRef.current = {
      view: viewRef.current,
      points: new Map(pointersRef.current),
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      event.currentTarget.setPointerCapture(
        event.pointerId,
      );

      cancelAnimation();

      pointersRef.current.set(
        event.pointerId,
        { x: event.clientX, y: event.clientY },
      );

      setIsDragging(true);

      setHoveredMarkerId(null);

      startInteraction();

      beginGesture();
    },
    [
      beginGesture,
      cancelAnimation,
      startInteraction,
    ],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (
        !pointersRef.current.has(
          event.pointerId,
        )
      ) {
        return;
      }

      pointersRef.current.set(
        event.pointerId,
        { x: event.clientX, y: event.clientY },
      );

      const gesture = gestureRef.current;

      if (!gesture) return;

      const rect =
        event.currentTarget.getBoundingClientRect();

      const ids = Array.from(
        pointersRef.current.keys(),
      );

      if (ids.length >= 2) {
        const [idA, idB] = ids;

        const startA = gesture.points.get(idA!);
        const startB = gesture.points.get(idB!);
        const nowA = pointersRef.current.get(idA!);
        const nowB = pointersRef.current.get(idB!);

        if (!startA || !startB || !nowA || !nowB) {
          return;
        }

        const startDistance = distance(
          startA,
          startB,
        );

        if (startDistance < 1) return;

        const currentDistance = distance(
          nowA,
          nowB,
        );

        const zoomRatio =
          currentDistance / startDistance;

        const currentFit = fitRef.current;

        const newWidth = clamp(
          gesture.view.width / zoomRatio,
          currentFit.width / ZOOM_RANGE,
          currentFit.width,
        );

        const newHeight =
          newWidth / (currentFit.width / currentFit.height);

        const startCenter = midpoint(
          startA,
          startB,
        );

        const currentCenter = midpoint(
          nowA,
          nowB,
        );

        const scaleX =
          gesture.view.width / rect.width;

        const scaleY =
          gesture.view.height / rect.height;

        const anchorUser: Point = {
          x:
            gesture.view.x +
            (startCenter.x - rect.left) *
              scaleX,
          y:
            gesture.view.y +
            (startCenter.y - rect.top) *
              scaleY,
        };

        const zoomedX =
          anchorUser.x -
          (anchorUser.x - gesture.view.x) *
            (newWidth / gesture.view.width);

        const zoomedY =
          anchorUser.y -
          (anchorUser.y - gesture.view.y) *
            (newHeight / gesture.view.height);

        const panX =
          (currentCenter.x - startCenter.x) *
          (newWidth / rect.width);

        const panY =
          (currentCenter.y - startCenter.y) *
          (newHeight / rect.height);

        setView(
          clampView(
            {
              x: zoomedX - panX,
              y: zoomedY - panY,
              width: newWidth,
              height: newHeight,
            },
            currentFit,
          ),
        );

        return;
      }

      const onlyId = ids[0];
      const start = gesture.points.get(onlyId!);
      const current =
        pointersRef.current.get(onlyId!);

      if (!start || !current) return;

      const scaleX =
        gesture.view.width / rect.width;

      const scaleY =
        gesture.view.height / rect.height;

      setView(
        clampView(
          {
            x:
              gesture.view.x -
              (current.x - start.x) * scaleX,
            y:
              gesture.view.y -
              (current.y - start.y) * scaleY,
            width: gesture.view.width,
            height: gesture.view.height,
          },
          fitRef.current,
        ),
      );
    },
    [],
  );

  const endPointer = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      pointersRef.current.delete(
        event.pointerId,
      );

      if (pointersRef.current.size === 0) {
        gestureRef.current = null;
        setIsDragging(false);
        endInteraction();
      } else {
        beginGesture();
      }
    },
    [beginGesture, endInteraction],
  );

  useEffect(() => {
    const svg = svgRef.current;

    if (!svg) return;

    const handleWheel = (
      event: WheelEvent,
    ) => {
      event.preventDefault();

      cancelAnimation();

      startInteraction();

      setHoveredMarkerId(null);

      const rect =
        svg.getBoundingClientRect();

      const current = viewRef.current;

      const scaleX = current.width / rect.width;
      const scaleY =
        current.height / rect.height;

      const pointerX =
        current.x +
        (event.clientX - rect.left) * scaleX;

      const pointerY =
        current.y +
        (event.clientY - rect.top) * scaleY;

      const zoomFactor = Math.exp(
        event.deltaY * 0.0015,
      );

      const currentFit = fitRef.current;

      const newWidth = clamp(
        current.width * zoomFactor,
        currentFit.width / ZOOM_RANGE,
        currentFit.width,
      );

      const newHeight =
        newWidth / (currentFit.width / currentFit.height);

      setView(
        clampView(
          {
            x:
              pointerX -
              (pointerX - current.x) *
                (newWidth / current.width),
            y:
              pointerY -
              (pointerY - current.y) *
                (newHeight / current.height),
            width: newWidth,
            height: newHeight,
          },
          currentFit,
        ),
      );

      // Let hover highlighting come back once the wheel goes quiet.
      endInteraction();
    };

    svg.addEventListener(
      "wheel",
      handleWheel,
      { passive: false },
    );

    return () =>
      svg.removeEventListener(
        "wheel",
        handleWheel,
      );
  }, [
    cancelAnimation,
    startInteraction,
    endInteraction,
  ]);

  /* ------------------------------------------------------------------ */
  /* Data                                                                */
  /* ------------------------------------------------------------------ */

  const byId = useMemo(
    () =>
      new Map(
        people.map((person) => [
          person.id,
          person,
        ]),
      ),
    [people],
  );

  const selected = selectedId
    ? byId.get(selectedId)
    : undefined;

  const countryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const person of people) {
      const country =
        getPersonCountryName(person);

      if (!country) continue;

      counts.set(
        country,
        (counts.get(country) ?? 0) + 1,
      );
    }

    return counts;
  }, [people]);

  const hoveredCountryCount = hoveredCountry
    ? countryCounts.get(
        hoveredCountry.properties.name,
      ) ?? 0
    : 0;

  const connectedIds = useMemo(
    () =>
      new Set(
        connections.flatMap((connection) => [
          connection.sourceId,
          connection.targetId,
        ]),
      ),
    [connections],
  );

  const relatedIds = useMemo(() => {
    if (!selectedId) return null;

    const result = new Set<string>();
    result.add(selectedId);

    for (const connection of connections) {
      if (connection.sourceId === selectedId) {
        result.add(connection.targetId);
      }

      if (connection.targetId === selectedId) {
        result.add(connection.sourceId);
      }
    }

    return result;
  }, [selectedId, connections]);

  const dimmedIds = useMemo(() => {
    const result = new Set<string>();

    if (selectedId && relatedIds) {
      for (const person of people) {
        if (!relatedIds.has(person.id)) {
          result.add(person.id);
        }
      }
    } else if (networkMode) {
      for (const person of people) {
        if (!connectedIds.has(person.id)) {
          result.add(person.id);
        }
      }
    }

    return result;
  }, [
    people,
    selectedId,
    relatedIds,
    networkMode,
    connectedIds,
  ]);

  const markerPoints = useMemo(
    () =>
      people.map((person) => {
        const projected = projection([
          person.longitude,
          person.latitude,
        ]) ?? [
          TEXTURE_WIDTH / 2,
          TEXTURE_HEIGHT / 2,
        ];

        return {
          person,
          x: projected[0]!,
          y: projected[1]!,
        };
      }),
    [people],
  );

  const pointById = useMemo(
    () =>
      new Map(
        markerPoints.map((point) => [
          point.person.id,
          point,
        ]),
      ),
    [markerPoints],
  );

  const selectedMarker = selectedId
    ? pointById.get(selectedId)
    : undefined;

  const activeConnections = useMemo(() => {
    if (!selectedId && !networkMode) return [];

    return connections.filter((connection) => {
      if (
        !byId.has(connection.sourceId) ||
        !byId.has(connection.targetId)
      ) {
        return false;
      }

      if (
        selectedId &&
        connection.sourceId !== selectedId &&
        connection.targetId !== selectedId
      ) {
        return false;
      }

      return true;
    });
  }, [connections, byId, selectedId, networkMode]);

  // Note: connections that cross the antimeridian (e.g. longitude -170 to
  // +170) draw as a long arc across the map rather than the short way
  // around, since a flat map has no seam-aware routing. This mirrors most
  // flat-map UIs but is worth knowing if your data has trans-Pacific links.
  const connectionPaths = useMemo(() => {
    return activeConnections
      .map((connection) => {
        const source = pointById.get(
          connection.sourceId,
        );

        const target = pointById.get(
          connection.targetId,
        );

        if (!source || !target) return null;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.hypot(dx, dy) || 1;

        const mid = {
          x: (source.x + target.x) / 2,
          y: (source.y + target.y) / 2,
        };

        const normal = {
          x: -dy / dist,
          y: dx / dist,
        };

        const bow = dist * 0.16;

        const control = {
          x: mid.x + normal.x * bow,
          y: mid.y + normal.y * bow,
        };

        const d = `M ${source.x} ${source.y} Q ${control.x} ${control.y} ${target.x} ${target.y}`;

        return {
          connection,
          d,
          color: getConnectionColor(
            connection.type,
          ),
        };
      })
      .filter(
        (
          item,
        ): item is {
          connection: Connection;
          d: string;
          color: string;
        } => item !== null,
      );
  }, [activeConnections, pointById]);

  /* ------------------------------------------------------------------ */
  /* Focus / reset                                                       */
  /* ------------------------------------------------------------------ */

  const previousResetVersion = useRef(
    resetVersion,
  );

  useEffect(() => {
    if (selected) {
      const projected = projection([
        selected.longitude,
        selected.latitude,
      ]) ?? [
        TEXTURE_WIDTH / 2,
        TEXTURE_HEIGHT / 2,
      ];

      // Zoom to roughly the same magnification the globe uses, measured
      // against the fitted view so it holds on any container shape.
      const fit = fitRef.current;

      const width = fit.width / 5;

      const height = width / (fit.width / fit.height);

      animateTo({
        x: projected[0]! - width / 2,
        y: projected[1]! - height / 2,
        width,
        height,
      });
    } else if (
      previousResetVersion.current !==
      resetVersion
    ) {
      animateTo(fitRef.current);
    }

    previousResetVersion.current = resetVersion;
  }, [
    selected,
    focusVersion,
    resetVersion,
    animateTo,
  ]);

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div
      ref={containerRef}
      className="globe-canvas flatmap-canvas"
      aria-label="Flat map showing changemaker locations"
      style={{
        // Fills the stage outright: the viewBox is fitted to whatever box this
        // measures, so there is no letterboxed gap under the map.
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        background: palette.ocean,
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        preserveAspectRatio="none"
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          touchAction: "none",
          cursor: isDragging
            ? "grabbing"
            : "grab",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <rect
          x={0}
          y={0}
          width={TEXTURE_WIDTH}
          height={TEXTURE_HEIGHT}
          fill={palette.ocean}
        />

        <g>
          {countryPaths.map(
            ({ country, d }) =>
              d && (
                <path
                  key={country.properties.name}
                  d={d}
                  fill={palette.land}
                  stroke={palette.outline}
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                  onPointerEnter={() =>
                    setHoveredCountry(country)
                  }
                  onPointerLeave={() =>
                    setHoveredCountry(
                      (current) =>
                        current === country
                          ? null
                          : current,
                    )
                  }
                />
              ),
          )}

          {hoveredCountry && (
            <path
              d={
                countryPaths.find(
                  (item) =>
                    item.country ===
                    hoveredCountry,
                )?.d
              }
              fill={palette.highlight}
              fillOpacity={0.32}
              stroke={palette.highlight}
              strokeWidth={1.6}
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
          )}
        </g>

        <g>
          {connectionPaths.map(
            ({ connection, d, color }) => (
              <g key={connection.id}>
                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={14}
                  strokeOpacity={0}
                  vectorEffect="non-scaling-stroke"
                  style={{ cursor: "pointer" }}
                  onClick={() =>
                    onConnection(connection)
                  }
                />

                <path
                  d={d}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.6}
                  strokeOpacity={0.9}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />

                {!reducedMotion && (
                  <circle
                    r={2.5 * unitsPerPixel}
                    fill="#ffffff"
                    fillOpacity={0.9}
                    pointerEvents="none"
                  >
                    <animateMotion
                      dur="6s"
                      repeatCount="indefinite"
                      path={d}
                    />
                  </circle>
                )}
              </g>
            ),
          )}
        </g>

        <g>
          {markerPoints
            .filter(
              (point) =>
                point.person.id !== selectedId,
            )
            .map((point) => (
              <circle
                key={point.person.id}
                cx={point.x}
                cy={point.y}
                r={
                  (hoveredMarkerId ===
                  point.person.id
                    ? 6.5
                    : 4.5) * unitsPerPixel
                }
                fill={categoryColor(
                  point.person.category,
                )}
                fillOpacity={
                  dimmedIds.has(
                    point.person.id,
                  )
                    ? 0.28
                    : 0.9
                }
                style={{ cursor: "pointer" }}
                onPointerEnter={() => {
                  if (hoverEnabled) {
                    setHoveredMarkerId(
                      point.person.id,
                    );
                  }
                }}
                onPointerLeave={() =>
                  setHoveredMarkerId(
                    (current) =>
                      current ===
                      point.person.id
                        ? null
                        : current,
                  )
                }
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(point.person.id);
                }}
              />
            ))}

          {selectedMarker && (
            <g pointerEvents="none">
              <circle
                cx={selectedMarker.x}
                cy={selectedMarker.y}
                r={13 * unitsPerPixel}
                fill={categoryColor(
                  selectedMarker.person
                    .category,
                )}
                fillOpacity={0.28}
              />

              <circle
                cx={selectedMarker.x}
                cy={selectedMarker.y}
                r={6.5 * unitsPerPixel}
                fill={categoryColor(
                  selectedMarker.person
                    .category,
                )}
              />
            </g>
          )}
        </g>
      </svg>

      {hoveredCountry && (
        <div
          className="globe-country-label"
          role="status"
          aria-live="polite"
        >
          <strong>
            {hoveredCountry.properties.name}
          </strong>

          <span>
            {hoveredCountryCount}{" "}
            {hoveredCountryCount === 1
              ? "changemaker"
              : "changemakers"}
          </span>
        </div>
      )}
    </div>
  );
}
