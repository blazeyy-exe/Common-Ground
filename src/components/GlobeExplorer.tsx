import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Environment,
  Lightformer,
  OrbitControls,
  Stars,
} from "@react-three/drei";
import { ArrowRight } from "lucide-react";
import React, {useCallback, useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import {
  geoContains,
  geoEquirectangular,
  geoPath,
} from "d3-geo";
import type {
  Feature,
  FeatureCollection,
  Geometry,
} from "geojson";
import type {
  GeometryCollection,
  Topology,
} from "topojson-specification";

/**
 * The underlying three-stdlib OrbitControls instance that drei's component
 * exposes through its ref. Derived from the component's own ref type rather
 * than importing three-stdlib directly, so this file does not need
 * three-stdlib as a direct dependency just for a type.
 */
type OrbitControlsImpl = React.ComponentRef<
  typeof OrbitControls
>;

import atlas from "@/data/world-atlas.json";
import {
  categoryColor,
  type Changemaker,
} from "@/data/changemakers";
import type { Connection } from "@/data/connections";

const RADIUS = 2.55;
const DEG = Math.PI / 180;

// Shared with MapExplorer's flat-map projection, which mirrors this
// equirectangular setup against the same texture dimensions.
export const TEXTURE_WIDTH = 2048;
export const TEXTURE_HEIGHT = 1024;

type GlobePalette = {
  ocean: string;
  land: string;
  outline: string;
  /**
   * Desaturated blue for marks drawn *on* the sphere: the land wash, the
   * country hover fill and its stroke. Kept close in value to `ocean` so a
   * highlighted country reads as a lift rather than a different material.
   */
  highlight: string;
  /**
   * The atmosphere: the limb rim and the outer haze shells, plus the light
   * they imply. Deeper and bluer than `highlight`, and the same hue family as
   * the stage backdrop, so the glow dissolves into the wall instead of
   * stopping at a hard silhouette.
   */
  atmosphere: string;
  text: string;
};

export type CountryFeature = Feature<
  Geometry,
  { name: string }
>;

const topology =
  atlas as unknown as Topology<{
    countries: GeometryCollection;
  }>;

export const countryFeatures: FeatureCollection<
  Geometry,
  { name: string }
> = feature(
  topology,
  topology.objects.countries,
) as FeatureCollection<
  Geometry,
  { name: string }
>;

/* -------------------------------------------------------------------------- */
/* Projection                                                                */
/* -------------------------------------------------------------------------- */

export const projection = geoEquirectangular()
  .rotate([-90, 0])
  .scale(TEXTURE_WIDTH / (2 * Math.PI))
  .translate([
    TEXTURE_WIDTH / 2,
    TEXTURE_HEIGHT / 2,
  ]);

/* -------------------------------------------------------------------------- */
/* Country spatial index                                                     */
/* -------------------------------------------------------------------------- */

type CountryBBox = {
  feature: CountryFeature;
  name: string;
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
};

const countryBBoxes: CountryBBox[] =
  countryFeatures.features.map((country) => {
    let minLon = 180;
    let maxLon = -180;
    let minLat = 90;
    let maxLat = -90;

    const traverse = (coords: unknown): void => {
      if (
        Array.isArray(coords) &&
        typeof coords[0] === "number"
      ) {
        const lon = coords[0] as number;
        const lat = coords[1] as number;

        minLon = Math.min(minLon, lon);
        maxLon = Math.max(maxLon, lon);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);

        return;
      }

      if (Array.isArray(coords)) {
        for (const child of coords) {
          traverse(child);
        }
      }
    };

    if ("coordinates" in country.geometry) {
      traverse(country.geometry.coordinates);
    }

    return {
      feature: country,
      name: country.properties.name,
      minLon,
      maxLon,
      minLat,
      maxLat,
    };
  });

const GRID_COLS = 72;
const GRID_ROWS = 36;

const spatialGrid: CountryBBox[][] = Array.from(
  {
    length: GRID_COLS * GRID_ROWS,
  },
  () => [],
);

for (const bbox of countryBBoxes) {
  const minX = Math.max(
    0,
    Math.min(
      GRID_COLS - 1,
      Math.floor((bbox.minLon + 180) / 5),
    ),
  );

  const maxX = Math.max(
    0,
    Math.min(
      GRID_COLS - 1,
      Math.floor((bbox.maxLon + 180) / 5),
    ),
  );

  const minY = Math.max(
    0,
    Math.min(
      GRID_ROWS - 1,
      Math.floor((bbox.minLat + 90) / 5),
    ),
  );

  const maxY = Math.max(
    0,
    Math.min(
      GRID_ROWS - 1,
      Math.floor((bbox.maxLat + 90) / 5),
    ),
  );

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      spatialGrid[y * GRID_COLS + x]!.push(
        bbox,
      );
    }
  }
}

export function findCountryAt(
  longitude: number,
  latitude: number,
  lastCountry: CountryFeature | null,
): CountryFeature | null {
  if (
    lastCountry &&
    geoContains(lastCountry, [
      longitude,
      latitude,
    ])
  ) {
    return lastCountry;
  }

  const gx = Math.max(
    0,
    Math.min(
      GRID_COLS - 1,
      Math.floor((longitude + 180) / 5),
    ),
  );

  const gy = Math.max(
    0,
    Math.min(
      GRID_ROWS - 1,
      Math.floor((latitude + 90) / 5),
    ),
  );

  const candidates =
    spatialGrid[gy * GRID_COLS + gx] ?? [];

  for (const candidate of candidates) {
    if (
      longitude < candidate.minLon ||
      longitude > candidate.maxLon ||
      latitude < candidate.minLat ||
      latitude > candidate.maxLat
    ) {
      continue;
    }

    if (
      geoContains(candidate.feature, [
        longitude,
        latitude,
      ])
    ) {
      return candidate.feature;
    }
  }

  return null;
}

/* -------------------------------------------------------------------------- */
/* Person -> country                                                         */
/* -------------------------------------------------------------------------- */

const personCountryMap = new Map<
  string,
  string
>();

function resolvePersonCountry(
  person: Changemaker,
): string | undefined {
  const cached = personCountryMap.get(
    person.id,
  );

  if (cached) return cached;

  for (const bbox of countryBBoxes) {
    if (
      person.longitude < bbox.minLon ||
      person.longitude > bbox.maxLon ||
      person.latitude < bbox.minLat ||
      person.latitude > bbox.maxLat
    ) {
      continue;
    }

    if (
      geoContains(bbox.feature, [
        person.longitude,
        person.latitude,
      ])
    ) {
      personCountryMap.set(
        person.id,
        bbox.name,
      );

      return bbox.name;
    }
  }

  return undefined;
}

export function getPersonCountryName(
  person: Changemaker,
): string | undefined {
  return resolvePersonCountry(person);
}

/* -------------------------------------------------------------------------- */
/* Palette                                                                    */
/* -------------------------------------------------------------------------- */

export function readGlobePalette(): GlobePalette {
  if (typeof document === "undefined") {
    return {
      ocean: "#121715",
      land: "#1e2823",
      outline: "#405247",
      highlight: "#5d7fa8",
      atmosphere: "#3b6fa8",
      text: "#f0fdf4",
    };
  }

  const styles =
    getComputedStyle(
      document.documentElement,
    );

  return {
    ocean:
      styles
        .getPropertyValue(
          "--surface-strong",
        )
        .trim() || "#121715",

    land:
      styles
        .getPropertyValue(
          "--surface-muted",
        )
        .trim() || "#1e2823",

    outline:
      styles
        .getPropertyValue(
          "--text-tertiary",
        )
        .trim() || "#405247",

    highlight:
      styles
        .getPropertyValue(
          "--globe-highlight",
        )
        .trim() || "#5d7fa8",

    atmosphere:
      styles
        .getPropertyValue(
          "--globe-atmosphere",
        )
        .trim() || "#3b6fa8",

    text:
      styles
        .getPropertyValue(
          "--text-primary",
        )
        .trim() || "#f0fdf4",
  };
}

/* -------------------------------------------------------------------------- */
/* Globe coordinates                                                          */
/* -------------------------------------------------------------------------- */

export function globePoint(
  latitude: number,
  longitude: number,
  radius = RADIUS,
) {
  const lat = latitude * DEG;
  const lon = longitude * DEG;

  return new THREE.Vector3(
    radius *
      Math.cos(lat) *
      Math.sin(lon),

    radius * Math.sin(lat),

    radius *
      Math.cos(lat) *
      Math.cos(lon),
  );
}

/* -------------------------------------------------------------------------- */
/* Base earth texture                                                         */
/* -------------------------------------------------------------------------- */

function createBaseEarthTexture(
  palette: GlobePalette,
): THREE.CanvasTexture {
  const canvas =
    document.createElement("canvas");

  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Unable to create globe texture canvas.",
    );
  }

  ctx.fillStyle = palette.ocean;
  ctx.fillRect(
    0,
    0,
    TEXTURE_WIDTH,
    TEXTURE_HEIGHT,
  );

  const path = geoPath(
    projection,
    ctx,
  );

  ctx.beginPath();
  path(countryFeatures);

  ctx.fillStyle = palette.land;
  ctx.fill();

  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 1.15;
  ctx.stroke();

  /*
   * Subtle highlight wash over the land. Alpha is kept low and the colour is
   * desaturated on purpose: this is a tint that should barely separate land
   * from ocean at rest, not a second land colour.
   */
  ctx.beginPath();
  path(countryFeatures);

  ctx.fillStyle = palette.highlight;
  ctx.globalAlpha = 0.12;
  ctx.fill();

  ctx.globalAlpha = 1;

  const texture =
    new THREE.CanvasTexture(canvas);

  texture.colorSpace =
    THREE.SRGBColorSpace;

  texture.anisotropy = 4;

  return texture;
}

/* -------------------------------------------------------------------------- */
/* Country highlight texture                                                 */
/* -------------------------------------------------------------------------- */

function createCountryHighlightTexture(
  country: CountryFeature,
  palette: GlobePalette,
): THREE.CanvasTexture | null {
  const canvas =
    document.createElement("canvas");

  canvas.width = TEXTURE_WIDTH;
  canvas.height = TEXTURE_HEIGHT;

  const ctx = canvas.getContext("2d");

  if (!ctx) return null;

  const path = geoPath(
    projection,
    ctx,
  );

  ctx.clearRect(
    0,
    0,
    TEXTURE_WIDTH,
    TEXTURE_HEIGHT,
  );

  ctx.beginPath();
  path(country);

  ctx.fillStyle = palette.highlight;
  ctx.globalAlpha = 0.72;
  ctx.fill();

  ctx.globalAlpha = 1;

  ctx.strokeStyle = palette.highlight;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  const texture =
    new THREE.CanvasTexture(canvas);

  texture.colorSpace =
    THREE.SRGBColorSpace;

  texture.needsUpdate = true;

  return texture;
}

/* -------------------------------------------------------------------------- */
/* Atmosphere shell                                                           */
/* -------------------------------------------------------------------------- */

/*
 * The atmosphere used to be two `BackSide` spheres with a flat `opacity`, which
 * cannot look like a glow. A constant alpha is at full strength right up to the
 * shell's own silhouette, so the sphere's outline is drawn as a hard-edged disc
 * — the "aura" read as a cut-out circle pasted behind the globe rather than as
 * light spilling off it.
 *
 * This shader replaces that with a radial profile measured from the globe's
 * centre in the fragment stage. `vRadial` runs 0 at the point of the shell
 * facing the camera to 1 at the shell's limb (it is the perpendicular distance
 * from the view axis, divided by the shell radius), so alpha can be shaped as a
 * bump that is guaranteed to reach exactly 0 at the limb. Nothing is drawn at
 * the silhouette at all, and because the value is a smooth function of radius
 * rather than a per-vertex attribute, there is no faceting to give the edge
 * away either.
 *
 * `uInner`/`uOuter` place the rise and the decay. `uIntensity` scales the whole
 * thing, which is how the wide outer haze stays far fainter than the tight rim
 * without needing a second, differently-tuned shader.
 */
const atmosphereVertexShader = /* glsl */ `
  varying float vRadial;

  void main() {
    // View-space position of this vertex. The globe is centred on the origin
    // and the camera looks at the origin, so the view axis passes through the
    // view-space origin too, and the length of the xy part of the view-space
    // position is exactly the perpendicular distance from that axis.
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    vRadial = length(viewPosition.xy);

    gl_Position = projectionMatrix * viewPosition;
  }
`;

const atmosphereFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uRadius;
  uniform float uInner;
  uniform float uOuter;
  uniform float uIntensity;

  varying float vRadial;

  void main() {
    float t = clamp(vRadial / uRadius, 0.0, 1.0);

    // Rise away from the centre, decay back to nothing before the limb. Both
    // halves are smoothsteps, so the profile and its first derivative are
    // continuous and the falloff shows no crease.
    float rise = smoothstep(uInner, uOuter, t);
    float decay = 1.0 - smoothstep(uOuter, 1.0, t);

    // decay hits exactly 0 at t = 1, which is the whole point: alpha is zero
    // on the shell's own silhouette, so there is no edge to see.
    float alpha = rise * decay * uIntensity;

    if (alpha <= 0.0) discard;

    gl_FragColor = vec4(uColor, alpha);
  }
`;

type AtmosphereShellProps = {
  color: string;
  radius: number;
  inner: number;
  outer: number;
  intensity: number;
};

/**
 * One soft-glow shell. Rendered back-face-only and additively, with depth
 * writes off, so the shells layer over each other and over the stage without
 * occluding the globe.
 */
function AtmosphereShell({
  color,
  radius,
  inner,
  outer,
  intensity,
}: AtmosphereShellProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uRadius: { value: radius },
          uInner: { value: inner },
          uOuter: { value: outer },
          uIntensity: { value: intensity },
        },
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      }),
    [color, radius, inner, outer, intensity],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <mesh>
      <sphereGeometry args={[radius, 96, 64]} />
      <primitive
        object={material}
        attach="material"
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/* Static environment                                                         */
/* -------------------------------------------------------------------------- */

export const StaticGlobeEnvironment =
  React.memo(function StaticGlobeEnvironment({
    palette,
  }: {
    palette: GlobePalette;
  }) {
    return (
      <>
        <ambientLight intensity={1} />

        <directionalLight
          position={[4, 3, 6]}
          intensity={0}
        />

        <directionalLight
          position={[-5, -1, -3]}
          intensity={0}
        />

        <Environment>
          <Lightformer
            intensity={1.8}
            position={[0, 5, 5]}
            scale={[10, 10, 1]}
          />

          <Lightformer
            intensity={0.8}
            color={palette.atmosphere}
            position={[-5, 1, -1]}
            rotation-y={Math.PI / 2}
            scale={[20, 1, 1]}
          />
        </Environment>

        {/* `factor` is the only brightness lever drei's Stars exposes — it scales
            each star's `gl_PointSize`, and the star colour lightness is pinned at
            0.9 HSL, so colour and opacity are not independently tunable. Size
            randomized per star lands in [0.5 * factor, 1 * factor] and is then
            attenuated by depth (`30.0 / -mvPosition.z`), so the useful range here
            is narrow: below ~1.5 the field is a few stray pixels, and the old 2.2
            still read as dust. 3.2 with a modest count gives soft round glows
            rather than a wall of hard points, keeping the globe the brightest
            single element. `fade` stays on so the larger points stay round
            instead of rendering as opaque squares. */}
        <Stars
          radius={40}
          depth={35}
          count={340}
          factor={3.2}
          saturation={0}
          fade
          speed={0.08}
        />

        <mesh>
          <sphereGeometry
            args={[
              RADIUS + 0.055,
              64,
              48,
            ]}
          />

          <meshBasicMaterial
            color={palette.blue}
            transparent
            opacity={0.12}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>

        <mesh>
          <sphereGeometry
            args={[
              RADIUS + 0.19,
              64,
              48,
            ]}
          />

          <meshBasicMaterial
            color={palette.blue}
            transparent
            opacity={0.055}
            side={THREE.BackSide}
            depthWrite={false}
          />
        </mesh>
      </>
    );
  });

/* -------------------------------------------------------------------------- */
/* Earth layer                                                                */
/* -------------------------------------------------------------------------- */

export const EarthLayer = React.memo(
  function EarthLayer({
    palette,
    hoveredCountry,
    onCountryHover,
  }: {
    palette: GlobePalette;
    hoveredCountry: CountryFeature | null;
    onCountryHover: (
      country: CountryFeature | null,
    ) => void;
  }) {
    const lastHoveredRef =
      useRef<CountryFeature | null>(
        null,
      );

    const rafRef =
      useRef<number | null>(null);

    const pendingPointRef =
      useRef<THREE.Vector3 | null>(
        null,
      );

    /*
     * Base texture is independent of hover.
     */
    const baseTexture = useMemo(
      () =>
        createBaseEarthTexture(
          palette,
        ),
      [palette],
    );

    /*
     * Hover texture only changes when the
     * country changes.
     */
    const highlightTexture =
      useMemo(() => {
        if (!hoveredCountry) {
          return null;
        }

        return createCountryHighlightTexture(
          hoveredCountry,
          palette,
        );
      }, [
        hoveredCountry,
        palette,
      ]);

    useEffect(() => {
      return () => {
        baseTexture.dispose();
        highlightTexture?.dispose();
      };
    }, [
      baseTexture,
      highlightTexture,
    ]);

    const processPointerHover =
      useCallback(() => {
        rafRef.current = null;

        const point =
          pendingPointRef.current;

        if (!point) return;

        const direction =
          point.clone().normalize();

        const latitude =
          Math.asin(
            THREE.MathUtils.clamp(
              direction.y,
              -1,
              1,
            ),
          ) / DEG;

        const longitude =
          Math.atan2(
            direction.x,
            direction.z,
          ) / DEG;

        const country =
          findCountryAt(
            longitude,
            latitude,
            lastHoveredRef.current,
          );

        if (
          country !==
          lastHoveredRef.current
        ) {
          lastHoveredRef.current =
            country;

          onCountryHover(country);
        }
      }, [onCountryHover]);

    const handlePointerMove =
      useCallback(
        (event: {
          point: THREE.Vector3;
        }) => {
          pendingPointRef.current =
            event.point;

          if (
            rafRef.current === null
          ) {
            rafRef.current =
              requestAnimationFrame(
                processPointerHover,
              );
          }
        },
        [processPointerHover],
      );

    const handlePointerOut =
      useCallback(() => {
        if (
          rafRef.current !== null
        ) {
          cancelAnimationFrame(
            rafRef.current,
          );

          rafRef.current = null;
        }

        pendingPointRef.current =
          null;

        if (
          lastHoveredRef.current !==
          null
        ) {
          lastHoveredRef.current =
            null;

          onCountryHover(null);
        }
      }, [onCountryHover]);

    return (
      <group>
        {/* Base globe: deliberately unlit for constant brightness */}
        <mesh
          name="globe-surface"
          onPointerMove={
            handlePointerMove
          }
          onPointerOut={
            handlePointerOut
          }
        >
          <sphereGeometry
            args={[RADIUS, 80, 48]}
          />

          <meshBasicMaterial
            map={baseTexture}
            color={palette.text}
            toneMapped={false}
          />
        </mesh>

        {/* Country highlight layer */}
        {highlightTexture && (
          <mesh
            scale={[
              1.0008,
              1.0008,
              1.0008,
            ]}
          >
            <sphereGeometry
              args={[RADIUS, 80, 48]}
            />

            <meshBasicMaterial
              map={highlightTexture}
              transparent
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>
    );
  },
);

/* -------------------------------------------------------------------------- */
/* Marker layer                                                               */
/* -------------------------------------------------------------------------- */

type MarkerGroupProps = {
  people: Changemaker[];
  positions: THREE.Vector3[];
  color: string;
  dimmedIds: Set<string>;
  hoveredMarkerId: string | null;
  onSelect: (id: string) => void;
  onHoverMarker: (
    id: string | null,
  ) => void;
};

const CategoryInstancedGroup =
  React.memo(
    function CategoryInstancedGroup({
      people,
      positions,
      color,
      dimmedIds,
      hoveredMarkerId,
      onSelect,
      onHoverMarker,
    }: MarkerGroupProps) {
      const meshRef =
        useRef<THREE.InstancedMesh>(
          null,
        );

      const dummy =
        useMemo(
          () =>
            new THREE.Object3D(),
          [],
        );

      const geometry =
        useMemo(
          () =>
            new THREE.SphereGeometry(
              0.038,
              8,
              6,
            ),
          [],
        );

      useEffect(() => {
        return () =>
          geometry.dispose();
      }, [geometry]);

      /*
       * Update instance matrices.
       *
       * No useFrame.
       */
      useEffect(() => {
        const mesh =
          meshRef.current;

        if (!mesh) return;

        for (
          let i = 0;
          i < people.length;
          i++
        ) {
          const person =
            people[i]!;

          dummy.position.copy(
            positions[i]!,
          );

          /*
           * Hover only slightly enlarges
           * the actual dot.
           */
          const scale =
            hoveredMarkerId ===
            person.id
              ? 1.55
              : 1;

          dummy.scale.setScalar(
            scale,
          );

          dummy.updateMatrix();

          mesh.setMatrixAt(
            i,
            dummy.matrix,
          );
        }

        mesh.instanceMatrix.needsUpdate =
          true;
      }, [
        people,
        positions,
        hoveredMarkerId,
        dummy,
      ]);

      const handlePointerOver =
        useCallback(
          (event: {
            stopPropagation: () => void;
            instanceId?: number;
          }) => {
            if (
              event.instanceId ===
              undefined
            ) {
              return;
            }

            const person =
              people[
                event.instanceId
              ];

            if (!person) return;

            event.stopPropagation();

            onHoverMarker(
              person.id,
            );

            document.body.style.cursor =
              "pointer";
          },
          [
            people,
            onHoverMarker,
          ],
        );

      const handlePointerOut =
        useCallback(() => {
          onHoverMarker(null);
          document.body.style.cursor =
            "auto";
        }, [onHoverMarker]);

      const handleClick =
        useCallback(
          (event: {
            stopPropagation: () => void;
            instanceId?: number;
          }) => {
            if (
              event.instanceId ===
              undefined
            ) {
              return;
            }

            const person =
              people[
                event.instanceId
              ];

            if (!person) return;

            event.stopPropagation();

            onSelect(person.id);
          },
          [
            people,
            onSelect,
          ],
        );

      const opacity =
        dimmedIds.size > 0
          ? 0.28
          : 0.9;

      return (
        <instancedMesh
          ref={meshRef}
          args={[
            geometry,
            undefined,
            people.length,
          ]}
          onPointerOver={
            handlePointerOver
          }
          onPointerOut={
            handlePointerOut
          }
          onClick={handleClick}
        >
          <meshBasicMaterial
            color={color}
            transparent
            opacity={opacity}
            depthWrite={false}
            toneMapped={false}
          />
        </instancedMesh>
      );
    },
  );

/* -------------------------------------------------------------------------- */
/* Marker layer                                                               */
/* -------------------------------------------------------------------------- */

export const MarkerLayer =
  React.memo(function MarkerLayer({
    people,
    selectedId,
    hoveredMarkerId,
    dimmedIds,
    onSelect,
    onHoverMarker,
  }: {
    people: Changemaker[];
    selectedId: string | null;
    hoveredMarkerId: string | null;
    dimmedIds: Set<string>;
    onSelect: (id: string) => void;
    onHoverMarker: (
      id: string | null,
    ) => void;
  }) {
    const positions = useMemo(
      () =>
        people.map((person) =>
          globePoint(
            person.latitude,
            person.longitude,
            RADIUS + 0.055,
          ),
        ),
      [people],
    );

    const groups = useMemo(() => {
      const map =
        new Map<
          string,
          {
            people: Changemaker[];
            positions: THREE.Vector3[];
          }
        >();

      for (
        let i = 0;
        i < people.length;
        i++
      ) {
        const person =
          people[i]!;

        /*
         * Selected marker is rendered separately.
         */
        if (
          person.id ===
          selectedId
        ) {
          continue;
        }

        let group =
          map.get(
            person.category,
          );

        if (!group) {
          group = {
            people: [],
            positions: [],
          };

          map.set(
            person.category,
            group,
          );
        }

        group.people.push(person);
        group.positions.push(
          positions[i]!,
        );
      }

      return Array.from(
        map.entries(),
      ).map(
        ([
          category,
          group,
        ]) => ({
          category,
          color:
            categoryColor(
              category,
            ),
          ...group,
        }),
      );
    }, [
      people,
      positions,
      selectedId,
    ]);

    const selectedPerson =
      useMemo(
        () =>
          people.find(
            (person) =>
              person.id ===
              selectedId,
          ),
        [people, selectedId],
      );

    const selectedPosition =
      useMemo(() => {
        if (!selectedPerson) {
          return null;
        }

        return globePoint(
          selectedPerson.latitude,
          selectedPerson.longitude,
          RADIUS + 0.06,
        );
      }, [selectedPerson]);

    return (
      <group>
        {groups.map(
          (group) => (
            <CategoryInstancedGroup
              key={group.category}
              people={
                group.people
              }
              positions={
                group.positions
              }
              color={
                group.color
              }
              dimmedIds={
                dimmedIds
              }
              hoveredMarkerId={
                hoveredMarkerId
              }
              onSelect={
                onSelect
              }
              onHoverMarker={
                onHoverMarker
              }
            />
          ),
        )}

        {selectedPerson &&
          selectedPosition && (
            <group
              position={
                selectedPosition
              }
            >
              {/* Static subtle halo */}
              <mesh>
                <sphereGeometry
                  args={[
                    0.075,
                    12,
                    8,
                  ]}
                />

                <meshBasicMaterial
                  color={categoryColor(
                    selectedPerson.category,
                  )}
                  transparent
                  opacity={0.28}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>

              {/* Main selected dot */}
              <mesh>
                <sphereGeometry
                  args={[
                    0.055,
                    10,
                    8,
                  ]}
                />

                <meshBasicMaterial
                  color={categoryColor(
                    selectedPerson.category,
                  )}
                  toneMapped={false}
                />
              </mesh>
            </group>
          )}
      </group>
    );
  });

/* -------------------------------------------------------------------------- */
/* Connections                                                                */
/* -------------------------------------------------------------------------- */

export function getConnectionColor(
  type: string,
): string {
  switch (type) {
    case "Mentorship":
      return "#c59be8";

    case "Creative Partnership":
      return "#e99ab7";

    case "Community Exchange":
      return "#dfcb79";

    case "Collaboration":
      return "#91d5ad";

    default:
      return "#83d9dc";
  }
}

export const ConnectionLayer =
  React.memo(function ConnectionLayer({
    connections,
    byId,
    selectedId,
    networkMode,
    reducedMotion,
    onConnection,
  }: {
    connections: Connection[];
    byId: Map<
      string,
      Changemaker
    >;
    selectedId: string | null;
    networkMode: boolean;
    reducedMotion: boolean;
    onConnection: (
      connection: Connection,
    ) => void;
  }) {
    const activeConnections =
      useMemo(() => {
        if (
          !selectedId &&
          !networkMode
        ) {
          return [];
        }

        return connections.filter(
          (connection) => {
            const source =
              byId.get(
                connection.sourceId,
              );

            const target =
              byId.get(
                connection.targetId,
              );

            if (
              !source ||
              !target
            ) {
              return false;
            }

            if (
              selectedId &&
              connection.sourceId !==
                selectedId &&
              connection.targetId !==
                selectedId
            ) {
              return false;
            }

            return true;
          },
        );
      }, [
        connections,
        byId,
        selectedId,
        networkMode,
      ]);

    const curves = useMemo(
      () =>
        activeConnections.map(
          (connection) => {
            const source =
              byId.get(
                connection.sourceId,
              )!;

            const target =
              byId.get(
                connection.targetId,
              )!;

            const a =
              globePoint(
                source.latitude,
                source.longitude,
                RADIUS + 0.07,
              );

            const b =
              globePoint(
                target.latitude,
                target.longitude,
                RADIUS + 0.07,
              );

            const angle =
              a.angleTo(b);

            const points =
              Array.from(
                {
                  length: 25,
                },
                (_, i) => {
                  const t =
                    i / 24;

                  const direction =
                    a
                      .clone()
                      .lerp(
                        b,
                        t,
                      )
                      .normalize();

                  return direction.multiplyScalar(
                    RADIUS +
                      0.075 +
                      Math.sin(
                        Math.PI * t,
                      ) *
                        (0.22 +
                          angle *
                            0.32),
                  );
                },
              );

            const curve =
              new THREE.CatmullRomCurve3(
                points,
              );

            return {
              connection,
              curve,
              color:
                getConnectionColor(
                  connection.type,
                ),
            };
          },
        ),
      [
        activeConnections,
        byId,
      ],
    );

    const particleMesh =
      useRef<THREE.InstancedMesh>(
        null,
      );

    const particleGeometry =
      useMemo(
        () =>
          new THREE.SphereGeometry(
            0.043,
            8,
            6,
          ),
        [],
      );

    const dummy =
      useMemo(
        () =>
          new THREE.Object3D(),
        [],
      );

    useEffect(() => {
      return () =>
        particleGeometry.dispose();
    }, [
      particleGeometry,
    ]);

    useFrame(
      ({ clock }) => {
        if (
          reducedMotion ||
          !particleMesh.current ||
          curves.length === 0
        ) {
          return;
        }

        const mesh =
          particleMesh.current;

        const time =
          clock.elapsedTime *
          0.13;

        for (
          let i = 0;
          i < curves.length;
          i++
        ) {
          const curve =
            curves[i]!.curve;

          const point =
            curve.getPoint(
              (time +
                i * 0.33) %
                1,
            );

          dummy.position.copy(
            point,
          );

          dummy.updateMatrix();

          mesh.setMatrixAt(
            i,
            dummy.matrix,
          );
        }

        mesh.instanceMatrix.needsUpdate =
          true;
      },
    );

    if (curves.length === 0) {
      return null;
    }

    return (
      <group>
        {curves.map(
          ({
            connection,
            curve,
            color,
          }) => (
            <ConnectionTube
              key={
                connection.id
              }
              curve={curve}
              color={color}
              onClick={() =>
                onConnection(
                  connection,
                )
              }
            />
          ),
        )}

        {!reducedMotion && (
          <instancedMesh
            ref={particleMesh}
            args={[
              particleGeometry,
              undefined,
              curves.length,
            ]}
          >
            <meshBasicMaterial
              color="#ffffff"
              toneMapped={false}
            />
          </instancedMesh>
        )}
      </group>
    );
  });

function ConnectionTube({
  curve,
  color,
  onClick,
}: {
  curve: THREE.CatmullRomCurve3;
  color: string;
  onClick: () => void;
}) {
  const geometry = useMemo(
    () =>
      new THREE.TubeGeometry(
        curve,
        28,
        0.02,
        4,
        false,
      ),
    [curve],
  );

  useEffect(() => {
    return () =>
      geometry.dispose();
  }, [geometry]);

  return (
    <mesh
      geometry={geometry}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      onPointerOver={() => {
        document.body.style.cursor =
          "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor =
          "auto";
      }}
    >
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.96}
        toneMapped={false}
      />
    </mesh>
  );
}

/* -------------------------------------------------------------------------- */
/* Camera                                                                     */
/* -------------------------------------------------------------------------- */

/** How long the viewer must leave the globe alone before it resumes spinning. */
const IDLE_SPIN_DELAY_MS = 3000;

/**
 * Keeps the globe turning whenever nobody is driving it.
 *
 * `OrbitControls` only rotates while the user is actively dragging, so the
 * globe goes completely static the moment they let go. This watches the
 * controls' DOM node: any pointer or wheel activity stops the drift and
 * restarts a `IDLE_SPIN_DELAY_MS` countdown, and when that countdown elapses
 * with no input, `autoRotate` is switched back on so the camera drifts again.
 *
 * Implementation notes:
 *  - `autoRotate` is mutated through the controls ref rather than React state,
 *    so toggling it never triggers a scene re-render.
 *  - The listeners are attached in a layout effect keyed on the resolved
 *    element, because the ref is empty on the first render pass and the
 *    controls object is only created once the Canvas mounts.
 *  - `prefers-reduced-motion` disables the drift entirely.
 */
export const IdleAutoRotate = React.memo(
  function IdleAutoRotate({
    controlsRef,
    reducedMotion,
  }: {
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
    reducedMotion: boolean;
  }) {
    const { camera, scene } = useThree();
    const [element, setElement] =
      useState<HTMLElement | null>(null);

    const idleTimer = useRef<number | null>(null);
    const activePointers = useRef(new Set<number>());

    const clearIdleTimer = useCallback(() => {
      if (idleTimer.current !== null) {
        window.clearTimeout(idleTimer.current);
        idleTimer.current = null;
      }
    }, []);

    // `enabled` is read through a ref so the listener effect never needs to be
    // torn down and re-attached when the motion preference changes.
    const enabledRef = useRef(!reducedMotion);

    useEffect(() => {
      enabledRef.current = !reducedMotion;
    }, [reducedMotion]);

    // Subscribe once the controls' canvas element exists.
    useEffect(() => {
      const controls = controlsRef.current;
      if (!controls) return;

      setElement(controls.domElement ?? null);
    }, [controlsRef]);

    useEffect(() => {
      if (!element) return;

      const isOverGlobe = (event: PointerEvent | WheelEvent) => {
        const globe = scene.getObjectByName("globe-surface");
        const bounds = element.getBoundingClientRect();
        if (!globe || bounds.width === 0 || bounds.height === 0) {
          return false;
        }

        const pointer = new THREE.Vector2(
          ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
          -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(pointer, camera);

        return raycaster.intersectObject(globe, false).length > 0;
      };

      const handleActivity = () => {
        // Stop drifting immediately, then (re)start the idle countdown so the
        // globe only resumes once the viewer has genuinely stopped interacting.
        const controls = controlsRef.current;
        if (controls) controls.autoRotate = false;

        clearIdleTimer();

  if (!enabledRef.current || activePointers.current.size > 0) return;

        idleTimer.current = window.setTimeout(() => {
          idleTimer.current = null;
          const idleControls = controlsRef.current;
          if (idleControls) idleControls.autoRotate = true;
        }, IDLE_SPIN_DELAY_MS);
      };

      const handlePointerDown = (event: PointerEvent) => {
        if (!isOverGlobe(event)) return;
        activePointers.current.add(event.pointerId);
        handleActivity();
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (
          activePointers.current.has(event.pointerId) ||
          isOverGlobe(event)
        ) {
          handleActivity();
        }
      };

      const handlePointerEnd = (event: PointerEvent) => {
        if (!activePointers.current.delete(event.pointerId)) return;
        handleActivity();
      };

      const handleWheel = (event: WheelEvent) => {
        if (isOverGlobe(event)) handleActivity();
      };

      element.addEventListener("pointerdown", handlePointerDown);
      element.addEventListener("pointermove", handlePointerMove);
      element.addEventListener("wheel", handleWheel, { passive: true });
      window.addEventListener("pointerup", handlePointerEnd);
      window.addEventListener("pointercancel", handlePointerEnd);

      const controls = controlsRef.current;
      if (controls && enabledRef.current) {
        controls.autoRotate = true;
      }

      return () => {
        element.removeEventListener("pointerdown", handlePointerDown);
        element.removeEventListener("pointermove", handlePointerMove);
        element.removeEventListener("wheel", handleWheel);
        window.removeEventListener("pointerup", handlePointerEnd);
        window.removeEventListener("pointercancel", handlePointerEnd);
        clearIdleTimer();
        activePointers.current.clear();

        const controls = controlsRef.current;
        if (controls) controls.autoRotate = false;
      };
    }, [element, controlsRef, clearIdleTimer]);

    // Honour a live change to the motion preference: stop drifting now, and
    // when it is switched back off, let the listeners resume arming the timer.
    useEffect(() => {
      if (!reducedMotion) return;

      clearIdleTimer();
      const controls = controlsRef.current;
      if (controls) controls.autoRotate = false;
    }, [reducedMotion, controlsRef, clearIdleTimer]);

    return null;
  },
);

export const CameraController =
  React.memo(function CameraController({
    person,
    focusVersion,
    resetVersion,
    reducedMotion,
  }: {
    person:
      | Changemaker
      | undefined;
    focusVersion: number;
    resetVersion: number;
    reducedMotion: boolean;
  }) {
    const target =
      useRef<THREE.Vector3 | null>(
        null,
      );

    const previousResetVersion =
      useRef(resetVersion);

    useEffect(() => {
      if (person) {
        target.current =
          globePoint(
            person.latitude,
            person.longitude,
            8.2,
          );
      } else if (
        previousResetVersion.current !==
        resetVersion
      ) {
        target.current =
          new THREE.Vector3(
            8.8,
            2.2,
            -1.7,
          );
      }

      previousResetVersion.current =
        resetVersion;
    }, [
      person,
      focusVersion,
      resetVersion,
    ]);

    useFrame(
      ({ camera }, delta) => {
        if (!target.current) {
          return;
        }

        if (reducedMotion) {
          camera.position.copy(
            target.current,
          );

          camera.lookAt(
            0,
            0,
            0,
          );

          target.current =
            null;

          return;
        }

        const amount =
          1 -
          Math.exp(
            -2.2 *
              Math.min(
                delta,
                0.05,
              ),
          );

        const targetDirection =
          target.current
            .clone()
            .normalize();

        camera.position
          .normalize()
          .lerp(
            targetDirection,
            amount,
          )
          .normalize()
          .multiplyScalar(
            THREE.MathUtils.lerp(
              camera.position.length(),
              target.current.length(),
              amount,
            ),
          );

        camera.lookAt(
          0,
          0,
          0,
        );

        if (
          camera.position.distanceTo(
            target.current,
          ) < 0.015
        ) {
          target.current =
            null;
        }
      },
    );

    return null;
  });

/* -------------------------------------------------------------------------- */
/* Main component                                                             */
/* -------------------------------------------------------------------------- */

export function GlobeExplorer({
  people,
  connections,
  selectedId,
  focusVersion,
  resetVersion,
  networkMode = false,
  paused = false,
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
  /**
   * Stops the continuous WebGL render loop without tearing the canvas down.
   * Used while the router is committing a navigation away from `/`: the globe
   * would otherwise keep issuing `useFrame` callbacks and `gl.render` calls
   * that starve the main thread exactly when React needs it to unmount this
   * scene and paint the next route.
   *
   * R3F re-applies `frameloop` whenever the prop changes, and its global
   * `requestAnimationFrame` loop reschedules itself unconditionally, so
   * flipping back to `"always"` resumes on the very next frame. The one visible
   * side effect is that `setFrameloop` resets the three.js clock, so the marker
   * pulses and travelling-arc particles jump back to their start once the
   * globe resumes — acceptable for a pause that only spans a navigation.
   */
  paused?: boolean;
  onSelect: (id: string) => void;
  onConnection: (
    connection: Connection,
  ) => void;
  onFallback: () => void;
}) {
  const palette =
    useMemo(
      readGlobePalette,
      [],
    );

  // Ref to the live OrbitControls instance so the idle-spin logic can toggle
  // `autoRotate` imperatively, without re-rendering the scene.
  const controlsRef =
    useRef<OrbitControlsImpl | null>(
      null,
    );

  const [
    hoveredCountry,
    setHoveredCountry,
  ] =
    useState<CountryFeature | null>(
      null,
    );

  const [
    hoveredMarkerId,
    setHoveredMarkerId,
  ] =
    useState<string | null>(
      null,
    );

  const [
    reducedMotion,
    setReducedMotion,
  ] =
    useState(false);

  useEffect(() => {
    const media =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );

    setReducedMotion(
      media.matches,
    );

    const listener = (
      event: MediaQueryListEvent,
    ) => {
      setReducedMotion(
        event.matches,
      );
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

  const byId = useMemo(
    () =>
      new Map(
        people.map(
          (person) => [
            person.id,
            person,
          ],
        ),
      ),
    [people],
  );

  const selected =
    selectedId
      ? byId.get(
          selectedId,
        )
      : undefined;

  const countryCounts =
    useMemo(() => {
      const counts =
        new Map<
          string,
          number
        >();

      for (const person of people) {
        const country =
          getPersonCountryName(
            person,
          );

        if (!country) {
          continue;
        }

        counts.set(
          country,
          (counts.get(
            country,
          ) ?? 0) + 1,
        );
      }

      return counts;
    }, [people]);

  const hoveredCountryCount =
    hoveredCountry
      ? countryCounts.get(
          hoveredCountry
            .properties
            .name,
        ) ?? 0
      : 0;

  const connectedIds =
    useMemo(
      () =>
        new Set(
          connections.flatMap(
            (connection) => [
              connection.sourceId,
              connection.targetId,
            ],
          ),
        ),
      [connections],
    );

  const relatedIds =
    useMemo(() => {
      if (!selectedId) {
        return null;
      }

      const result =
        new Set<string>();

      result.add(
        selectedId,
      );

      for (const connection of connections) {
        if (
          connection.sourceId ===
          selectedId
        ) {
          result.add(
            connection.targetId,
          );
        }

        if (
          connection.targetId ===
          selectedId
        ) {
          result.add(
            connection.sourceId,
          );
        }
      }

      return result;
    }, [
      selectedId,
      connections,
    ]);

  const dimmedIds =
    useMemo(() => {
      const result =
        new Set<string>();

      if (
        selectedId &&
        relatedIds
      ) {
        for (const person of people) {
          if (
            !relatedIds.has(
              person.id,
            )
          ) {
            result.add(
              person.id,
            );
          }
        }
      } else if (
        networkMode
      ) {
        for (const person of people) {
          if (
            !connectedIds.has(
              person.id,
            )
          ) {
            result.add(
              person.id,
            );
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

  return (
    <div
      className="globe-canvas"
      aria-label="Interactive globe showing changemaker locations"
    >
      <Canvas
        fallback={
          <div className="globe-fallback">
            <strong>
              3D exploration isn't
              available on this
              device.
            </strong>

            <span>
              You can still
              explore the network.
            </span>

            <button
              type="button"
              onClick={
                onFallback
              }
            >
              Browse changemakers
              <ArrowRight
                size={15}
              />
            </button>
          </div>
        }
        camera={{
          position: [
            8.8,
            2.2,
            -1.7,
          ],
          fov: 42,
        }}
        dpr={[1, 1.35]}
        frameloop={paused ? "never" : "always"}
        gl={{
          antialias: true,
          alpha: true,
        }}
      >
        <StaticGlobeEnvironment
          palette={palette}
        />

        <EarthLayer
          palette={palette}
          hoveredCountry={
            hoveredCountry
          }
          onCountryHover={
            setHoveredCountry
          }
        />

        <MarkerLayer
          people={people}
          selectedId={
            selectedId
          }
          hoveredMarkerId={
            hoveredMarkerId
          }
          dimmedIds={
            dimmedIds
          }
          onSelect={
            onSelect
          }
          onHoverMarker={
            setHoveredMarkerId
          }
        />

        <ConnectionLayer
          connections={
            connections
          }
          byId={byId}
          selectedId={
            selectedId
          }
          networkMode={
            networkMode
          }
          reducedMotion={
            reducedMotion
          }
          onConnection={
            onConnection
          }
        />

        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.08}
          minDistance={4.3}
          maxDistance={12}
          enablePan={false}
          rotateSpeed={0.6}
          zoomSpeed={0.7}
        />

        {/* Resume the slow drift once the viewer has been idle a moment. */}
        <IdleAutoRotate
          controlsRef={controlsRef}
          reducedMotion={reducedMotion}
        />

        <CameraController
          person={selected}
          focusVersion={
            focusVersion
          }
          resetVersion={
            resetVersion
          }
          reducedMotion={
            reducedMotion
          }
        />
      </Canvas>

      {hoveredCountry && (
        <div
          className="globe-country-label"
          role="status"
          aria-live="polite"
        >
          <strong>
            {
              hoveredCountry
                .properties
                .name
            }
          </strong>

          <span>
            {
              hoveredCountryCount
            }{" "}
            {hoveredCountryCount ===
            1
              ? "changemaker"
              : "changemakers"}
          </span>
        </div>
      )}
    </div>
  );
}