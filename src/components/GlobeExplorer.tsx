import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, Stars } from "@react-three/drei";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { feature } from "topojson-client";
import { geoEquirectangular, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import atlas from "@/data/world-atlas.json";
import { categoryColor, type Changemaker } from "@/data/changemakers";
import type { Connection } from "@/data/connections";
import { geoContains } from "d3-geo";

const RADIUS = 2.55;
const DEG = Math.PI / 180;

type GlobePalette = {
  ocean: string;
  land: string;
  outline: string;
  blue: string;
  text: string;
};

type CountryFeature = Feature<Geometry, { name: string }>;

const topology = atlas as unknown as Topology<{ countries: GeometryCollection }>;
const countryFeatures = feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>;

function readGlobePalette(): GlobePalette {
  const styles = getComputedStyle(document.documentElement);
  return {
    ocean: styles.getPropertyValue("--surface-strong").trim(),
    land: styles.getPropertyValue("--surface-muted").trim(),
    outline: styles.getPropertyValue("--text-tertiary").trim(),
    blue: styles.getPropertyValue("--accent-blue").trim(),
    text: styles.getPropertyValue("--text-primary").trim(),
  };
}

export function globePoint(latitude: number, longitude: number, radius = RADIUS) {
  const lat = latitude * DEG;
  const lon = longitude * DEG;
  return new THREE.Vector3(
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.cos(lon),
  );
}

function createEarthTexture(palette: GlobePalette, hoveredCountry: CountryFeature | null) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { width, height } = canvas;
  ctx.fillStyle = palette.ocean;
  ctx.fillRect(0, 0, width, height);
  // Three's sphere seam is at 90°W; the projection centers that seam correctly.
  const projection = geoEquirectangular().rotate([-90, 0]).scale(width / (2 * Math.PI)).translate([width / 2, height / 2]);
  const path = geoPath(projection, ctx);
  ctx.beginPath();
  path(countryFeatures);
  ctx.fillStyle = palette.land;
  ctx.fill();
  ctx.strokeStyle = palette.outline;
  ctx.lineWidth = 1.15;
  ctx.stroke();
  // Add a second subtle, displaced land wash for texture rather than flat fill.
  ctx.beginPath();
  path(countryFeatures);
  ctx.fillStyle = palette.blue;
  ctx.globalAlpha = 0.12;
  ctx.fill();
  ctx.globalAlpha = 1;
  if (hoveredCountry) {
    ctx.beginPath();
    path(hoveredCountry);
    ctx.fillStyle = palette.blue;
    ctx.globalAlpha = 0.72;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = palette.blue;
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function Earth({ palette, hoveredCountry, onCountryHover }: { palette: GlobePalette; hoveredCountry: CountryFeature | null; onCountryHover: (country: CountryFeature | null) => void }) {
  const texture = useMemo(() => createEarthTexture(palette, hoveredCountry), [palette, hoveredCountry]);
  useEffect(() => () => texture?.dispose(), [texture]);
  return (
    <>
      <mesh
        onPointerMove={(event) => {
          const direction = event.point.clone().normalize();
          const latitude = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1)) / DEG;
          const longitude = Math.atan2(direction.x, direction.z) / DEG;
          const country = countryFeatures.features.find((candidate) => geoContains(candidate, [longitude, latitude])) ?? null;
          onCountryHover(country);
        }}
        onPointerOut={() => onCountryHover(null)}
      >
        <sphereGeometry args={[RADIUS, 80, 48]} />
        <meshStandardMaterial map={texture} color={palette.text} roughness={0.9} metalness={0.08} />
      </mesh>
      <mesh>
        <sphereGeometry args={[RADIUS + 0.055, 64, 48]} />
        <meshBasicMaterial color={palette.blue} transparent opacity={0.12} side={THREE.BackSide} />
      </mesh>
      <mesh>
        <sphereGeometry args={[RADIUS + 0.19, 64, 48]} />
        <meshBasicMaterial color={palette.blue} transparent opacity={0.055} side={THREE.BackSide} />
      </mesh>
    </>
  );
}

function GlobeMarker({ person, selected, dimmed, onSelect }: { person: Changemaker; selected: boolean; dimmed: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const ring = useRef<THREE.Mesh>(null);
  const reducedMotion = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const position = useMemo(() => globePoint(person.latitude, person.longitude, RADIUS + 0.065), [person]);
  const normal = useMemo(() => position.clone().normalize(), [position]);
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal), [normal]);
  const color = categoryColor(person.category);
  useFrame(({ clock }) => {
    if (ring.current) {
      const s = reducedMotion.current ? 1 : 1 + Math.sin(clock.elapsedTime * (selected ? 3.5 : 2.2)) * (selected ? 0.2 : 0.1);
      ring.current.scale.setScalar(s);
    }
  });
  return (
    <group position={position} quaternion={quaternion}>
      <mesh ref={ring} position-z={0.015}>
        <ringGeometry args={[selected ? 0.12 : 0.095, selected ? 0.145 : 0.112, 48]} />
        <meshBasicMaterial color={color} transparent opacity={dimmed ? 0.18 : selected || hovered ? 1 : 0.68} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position-z={0.025}>
        <sphereGeometry args={[selected ? 0.072 : 0.059, 20, 16]} />
        <meshBasicMaterial color={color} transparent opacity={dimmed ? 0.28 : 1} />
      </mesh>
      <mesh
        position-z={0.05}
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
      >
        <sphereGeometry args={[0.17, 12, 10]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

function ConnectionArc({ source, target, type, onClick }: { source: Changemaker; target: Changemaker; type: string; onClick: () => void }) {
  const particle = useRef<THREE.Mesh>(null);
  const reducedMotion = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const color = type === "Mentorship" ? "#c59be8" : type === "Creative Partnership" ? "#e99ab7" : type === "Community Exchange" ? "#dfcb79" : type === "Collaboration" ? "#91d5ad" : "#83d9dc";
  const curve = useMemo(() => {
    const a = globePoint(source.latitude, source.longitude, RADIUS + 0.07);
    const b = globePoint(target.latitude, target.longitude, RADIUS + 0.07);
    const angle = a.angleTo(b);
    const points = Array.from({ length: 33 }, (_, i) => {
      const t = i / 32;
      const direction = a.clone().lerp(b, t).normalize();
      return direction.multiplyScalar(RADIUS + 0.075 + Math.sin(Math.PI * t) * (0.22 + angle * 0.32));
    });
    return new THREE.CatmullRomCurve3(points);
  }, [source, target]);
  useFrame(({ clock }) => {
    if (particle.current && !reducedMotion.current) particle.current.position.copy(curve.getPoint((clock.elapsedTime * 0.13) % 1));
  });
  return (
    <>
      <mesh onClick={(e) => { e.stopPropagation(); onClick(); }} onPointerOver={() => { document.body.style.cursor = "pointer"; }} onPointerOut={() => { document.body.style.cursor = "auto"; }}>
        <tubeGeometry args={[curve, 64, 0.018, 6, false]} />
        <meshBasicMaterial color={color} transparent opacity={0.96} />
      </mesh>
      <mesh ref={particle} visible={!reducedMotion.current}>
        <sphereGeometry args={[0.043, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </>
  );
}

function FocusCamera({ person, focusVersion, resetVersion }: { person: Changemaker | undefined; focusVersion: number; resetVersion: number }) {
  const target = useRef<THREE.Vector3 | null>(null);
  const previousResetVersion = useRef(resetVersion);
  const reducedMotion = useRef(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    target.current = person
      ? globePoint(person.latitude, person.longitude, 8.2)
      : previousResetVersion.current !== resetVersion
        ? new THREE.Vector3(8.8, 2.2, -1.7)
        : null;
    previousResetVersion.current = resetVersion;
  }, [person, focusVersion, resetVersion]);
  useFrame(({ camera }, delta) => {
    if (!target.current) return;
    if (reducedMotion.current) {
      camera.position.copy(target.current);
    } else {
      const amount = 1 - Math.exp(-2.2 * Math.min(delta, 0.05));
      const distance = THREE.MathUtils.lerp(camera.position.length(), target.current.length(), amount);
      camera.position.normalize().lerp(target.current.clone().normalize(), amount).normalize().multiplyScalar(distance);
    }
    camera.lookAt(0, 0, 0);
    if (camera.position.distanceTo(target.current) < 0.015) target.current = null;
  });
  return null;
}

export function GlobeExplorer({ people, connections, selectedId, focusVersion, resetVersion, networkMode = false, onSelect, onConnection, onFallback }: {
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
  const palette = useMemo(readGlobePalette, []);
  const [hoveredCountry, setHoveredCountry] = useState<CountryFeature | null>(null);
  const countryCounts = useMemo(() => new Map(countryFeatures.features.map((country) => [
    country.properties.name,
    people.filter((person) => geoContains(country, [person.longitude, person.latitude])).length,
  ])), [people]);
  const hoveredCountryCount = hoveredCountry ? countryCounts.get(hoveredCountry.properties.name) ?? 0 : 0;
  const selected = people.find((person) => person.id === selectedId);
  const byId = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const connectedIds = useMemo(() => new Set(connections.flatMap((connection) => [connection.sourceId, connection.targetId])), [connections]);
  return (
    <div className="globe-canvas" aria-label="Interactive globe showing changemaker locations">
      <Canvas fallback={<div className="globe-fallback"><strong>3D exploration isn't available on this device.</strong><span>You can still explore the network.</span><button type="button" onClick={onFallback}>Browse changemakers <ArrowRight size={15} /></button></div>} camera={{ position: [8.8, 2.2, -1.7], fov: 42 }} dpr={[1, 1.35]} gl={{ antialias: true, alpha: true }}>
        <ambientLight intensity={1.15} />
        <directionalLight position={[4, 3, 6]} intensity={2.3} color={palette.text} />
        <directionalLight position={[-5, -1, -3]} intensity={0.8} color={palette.blue} />
        <Environment>
          <Lightformer intensity={1.8} position={[0, 5, 5]} scale={[10, 10, 1]} />
          <Lightformer intensity={0.8} color={palette.blue} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} />
        </Environment>
        <Stars radius={40} depth={35} count={420} factor={2.2} saturation={0} fade speed={0.08} />
        <Earth palette={palette} hoveredCountry={hoveredCountry} onCountryHover={setHoveredCountry} />
        {people.map((person) => {
          const dimmed = selectedId ? person.id !== selectedId && !connections.some((connection) => connectedIds.has(person.id) && (connection.sourceId === selectedId || connection.targetId === selectedId) && (connection.sourceId === person.id || connection.targetId === person.id)) : networkMode && !connectedIds.has(person.id);
          return <GlobeMarker key={person.id} person={person} selected={selectedId === person.id} dimmed={dimmed} onSelect={() => onSelect(person.id)} />;
        })}
        {(selectedId || networkMode) && connections.map((connection) => {
          const source = byId.get(connection.sourceId);
          const target = byId.get(connection.targetId);
          if (!source || !target || (selectedId && connection.sourceId !== selectedId && connection.targetId !== selectedId)) return null;
          return <ConnectionArc key={connection.id} source={source} target={target} type={connection.type} onClick={() => onConnection(connection)} />;
        })}
        <OrbitControls enableDamping dampingFactor={0.08} minDistance={4.3} maxDistance={12} enablePan={false} rotateSpeed={0.6} zoomSpeed={0.7} />
        <FocusCamera person={selected} focusVersion={focusVersion} resetVersion={resetVersion} />
      </Canvas>
      {hoveredCountry && <div className="globe-country-label" role="status" aria-live="polite"><strong>{hoveredCountry.properties.name}</strong><span>{hoveredCountryCount} {hoveredCountryCount === 1 ? "changemaker" : "changemakers"}</span></div>}
    </div>
  );
}
