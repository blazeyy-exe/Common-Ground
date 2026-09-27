import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, Fragment, useMemo, useRef, useState, useDeferredValue, useCallback } from "react";
import { ArrowRight, ArrowUpRight, ChevronDown, CircleHelp, Compass, Globe2, Layers3, List, MapPin, Network, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryTone, changemakers, type Changemaker } from "@/data/changemakers";
import { connections, type Connection } from "@/data/connections";
import { countriesByRegion, countryNames, regionNames } from "@/data/places";
import { sdgs } from "@/data/sdgs";
import { GlobeExplorer } from "@/components/GlobeExplorer";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Global Changemakers — People shaping what comes next" },
    { name: "description", content: "Explore changemakers and the connections between community-led initiatives across the Global South." },
    { property: "og:title", content: "Global Changemakers — An interactive explorer" },
    { property: "og:description", content: "Meet community builders across the Global South on an interactive globe." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: ExplorerPage,
});

const unique = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b));
const options = {
  category: unique(changemakers.map((p) => p.category)),
  region: unique([...regionNames, ...changemakers.map((p) => p.region)]),
  country: unique([...countryNames, ...changemakers.map((p) => p.country)]),
  sdg: [...new Set(sdgs.map((sdg) => sdg.number))].sort((a, b) => a - b),
};
const countryChoices: { value: string; label: string; group?: string }[] = [
  ...countriesByRegion.flatMap(({ region, countries }) => countries.map((country) => ({ value: country, label: country, group: region }))),
  ...options.country.filter((country) => !countryNames.includes(country)).map((value) => ({ value, label: value })),
];
const sdgByNumber = new Map(sdgs.map((sdg) => [sdg.number, sdg]));
type ExplorerMode = "explore" | "network";

/** 12.3456 -> `12°21′ N`, so the status bar reads like a surveyor's note. */
function formatCoordinate(value: number, positive: string, negative: string) {
  const absolute = Math.abs(value);
  const whole = Math.floor(absolute);
  const minutes = Math.round((absolute - whole) * 60);
  const degrees = minutes === 60 ? whole + 1 : whole;
  return `${degrees}°${String(minutes === 60 ? 0 : minutes).padStart(2, "0")}′ ${value < 0 ? negative : positive}`;
}

function SelectFilter({ label, value, onChange, choices }: { label: string; value: string; onChange: (value: string) => void; choices: { value: string; label: string }[] }) {
  return <label className="filter-field"><span>{label}</span><div className="select-wrap"><select className={value ? "filter-select filter-select--set" : "filter-select"} value={value} onChange={(event) => onChange(event.target.value)} aria-label={`Filter by ${label}`}><option value="">All {label === "SDG" ? "goals" : label === "Country" ? "countries" : `${label.toLowerCase()}s`}</option>{choices.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select><ChevronDown size={14} aria-hidden="true" /></div></label>;
}

function CategoryDot({ category }: { category: string }) {
  return <span className={`category-dot ${categoryTone(category)}`} />;
}

function SDGBadge({ number }: { number: number }) {
  const sdg = sdgByNumber.get(number);
  return <span className="sdg-badge" title={sdg?.name}><span className={`sdg-number sdg-number--${number}`}>{number}</span><span className="sdg-label">{sdg?.name ?? `Goal ${number}`}</span></span>;
}

function ProfilePanel({ person, onClose, onSelect, onConnection, onFollowRipple }: { person: Changemaker; onClose: () => void; onSelect: (id: string) => void; onConnection: (connection: Connection) => void; onFollowRipple: (person: Changemaker) => void }) {
  const related = connections.filter((connection) => connection.sourceId === person.id || connection.targetId === person.id);
  return <aside className="profile-panel" aria-label={`${person.name} profile`}>
    <div className="profile-scroll">
      <div className="profile-top"><span className="eyebrow">CHANGEMAKER PROFILE <span className="eyebrow-index">/ {person.id.toUpperCase()}</span></span><Button variant="ghost" size="icon" className="icon-button" title="Close profile" aria-label="Close profile" onClick={onClose}><X size={18} /></Button></div>
      <div className="profile-avatar">{person.name.split(" ").map((word) => word[0]).join("")}</div>
      <div className="profile-identity"><span className="profile-category"><CategoryDot category={person.category} />{person.category}</span><h2>{person.name}</h2><p className="profile-location"><MapPin size={15} />{person.city}, {person.country}<span className="location-divider">·</span>{person.region}</p></div>
      <div className="profile-rule" />
      <div className="profile-section"><span className="section-label">THE WORK</span><h3>{person.organization}</h3><p className="profile-bio">{person.bio}</p></div>
      <div className="profile-section"><span className="section-label">FOCUS AREAS</span><div className="tag-list">{person.focusAreas.map((focus) => <span className="focus-tag" key={focus}>{focus}</span>)}</div></div>
      <div className="profile-section"><span className="section-label">SUSTAINABLE DEVELOPMENT GOALS</span><div className="sdg-list">{person.sdgs.map((number) => <SDGBadge key={number} number={number} />)}</div></div>
      <div className="profile-rule" />
      <div className="profile-section connections-section"><span className="section-label">CONNECTIONS <span className="section-count">{related.length.toString().padStart(2, "0")}</span></span>
        {related.length ? related.map((connection) => {
          const other = changemakers.find((p) => p.id === (connection.sourceId === person.id ? connection.targetId : connection.sourceId));
          if (!other) return null;
          return <div className="connection-item" key={connection.id}><Button variant="ghost" className="connection-person" onClick={() => onSelect(other.id)}><span className="connection-monogram">{other.name.split(" ").map((word) => word[0]).join("")}</span><span><strong>{other.name}</strong><small>{other.city}, {other.country}</small></span><ArrowRight size={16} /></Button><Button variant="ghost" className="connection-type" onClick={() => onConnection(connection)}><Network size={13} />{connection.type}<ArrowUpRight size={13} /></Button></div>;
        }) : <p className="profile-bio">No connections yet.</p>}
      </div>
      {related.length > 0 && <Button variant="secondary" className="ripple-button" onClick={() => onFollowRipple(person)}><Sparkles size={15} />Follow the ripple <ArrowRight size={15} /></Button>}
    </div>
  </aside>;
}

function ExplorerPage() {
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get("q") ?? "");
  const [filters, setFilters] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return { sdg: params.get("sdg") ?? "", category: params.get("category") ?? "", region: params.get("region") ?? "", country: params.get("country") ?? "" };
  });
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const id = new URLSearchParams(window.location.search).get("person");
    return changemakers.some((person) => person.id === id) ? id : null;
  });
  const [mode, setMode] = useState<ExplorerMode>(() => {
    const value = new URLSearchParams(window.location.search).get("mode");
    return value === "network" ? value : "explore";
  });
  const [focusVersion, setFocusVersion] = useState(0);
  const [resetVersion, setResetVersion] = useState(0);
  const [view, setView] = useState<"globe" | "list">("globe");
  const [detail, setDetail] = useState<Connection | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [rippleMessage, setRippleMessage] = useState("");
  const searchInput = useRef<HTMLInputElement>(null);
  const rippleTimer = useRef<number | undefined>(undefined);
  useEffect(() => { if (window.matchMedia("(max-width: 700px)").matches) setView("list"); }, []);
  const results = useMemo(() => {
    const query = search.trim().toLowerCase();
    return changemakers.filter((person) => {
      if (filters.sdg && !person.sdgs.includes(Number(filters.sdg))) return false;
      if (filters.category && person.category !== filters.category) return false;
      if (filters.region && person.region !== filters.region) return false;
      if (filters.country && person.country !== filters.country) return false;
      return !query || [person.name, person.city, person.country, person.organization, person.category, ...person.focusAreas].some((value) => value.toLowerCase().includes(query));
    });
  }, [search, filters]);
  const selected = changemakers.find((person) => person.id === selectedId);
  // The coordinate readout tracks the open profile, and falls back to the middle
  // of whatever the current filters leave on screen.
  const focusPoint = useMemo(() => {
    if (selected) return { latitude: selected.latitude, longitude: selected.longitude, label: `${selected.name} — ${selected.city}` };
    if (!results.length) return null;
    return {
      latitude: results.reduce((sum, person) => sum + person.latitude, 0) / results.length,
      longitude: results.reduce((sum, person) => sum + person.longitude, 0) / results.length,
      label: "Centre of the current results",
    };
  }, [selected, results]);
  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const clearFilters = () => { setFilters({ sdg: "", category: "", region: "", country: "" }); setSearch(""); };
  const selectPerson = (id: string) => {
    if (!results.some((person) => person.id === id)) clearFilters();
    window.clearTimeout(rippleTimer.current);
    setRippleMessage("");
    setDetail(null);
    setSelectedId(id);
    setFocusVersion((version) => version + 1);
    setView("globe");
  };
  const closeProfile = () => {
    setSelectedId(null);
    setFocusVersion((version) => version + 1);
  };
  const setFilter = (key: keyof typeof filters) => (value: string) => setFilters((previous) => ({ ...previous, [key]: value }));
  const resetView = () => {
    window.clearTimeout(rippleTimer.current);
    setRippleMessage("");
    setSelectedId(null);
    setDetail(null);
    clearFilters();
    setMode("explore");
    setView("globe");
    setFocusVersion((version) => version + 1);
    setResetVersion((version) => version + 1);
  };
  const discover = () => {
    const pool = results.length ? results : changemakers;
    const currentIndex = pool.findIndex((person) => person.id === selectedId);
    selectPerson(pool[(currentIndex + 1) % pool.length]!.id);
  };
  const followRipple = (person: Changemaker) => {
    const connection = connections.find((item) => item.sourceId === person.id || item.targetId === person.id);
    if (!connection) return;
    const nextId = connection.sourceId === person.id ? connection.targetId : connection.sourceId;
    const nextPerson = changemakers.find((item) => item.id === nextId);
    if (!nextPerson) return;
    window.clearTimeout(rippleTimer.current);
    setRippleMessage(`${connection.type} · ${nextPerson.name}, ${nextPerson.country}`);
    rippleTimer.current = window.setTimeout(() => selectPerson(nextId), 1050);
  };
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedId) params.set("person", selectedId);
    if (mode !== "explore") params.set("mode", mode);
    if (filters.sdg) params.set("sdg", filters.sdg);
    if (filters.category) params.set("category", filters.category);
    if (filters.region) params.set("region", filters.region);
    if (filters.country) params.set("country", filters.country);
    if (search.trim()) params.set("q", search.trim());
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [selectedId, mode, filters, search]);
  useEffect(() => {
    const restoreUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const personId = params.get("person");
      const urlMode = params.get("mode");
      setSelectedId(changemakers.some((person) => person.id === personId) ? personId : null);
      setMode(urlMode === "network" ? urlMode : "explore");
      setFilters({ sdg: params.get("sdg") ?? "", category: params.get("category") ?? "", region: params.get("region") ?? "", country: params.get("country") ?? "" });
      setSearch(params.get("q") ?? "");
      setFocusVersion((version) => version + 1);
      setResetVersion((version) => version + 1);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.matches("input, textarea, select, [contenteditable='true']");
      if (event.key === "Escape") {
        setDetail(null);
        setShowHelp(false);
        closeProfile();
        searchInput.current?.blur();
      } else if (!typing && event.key === "/") {
        event.preventDefault();
        searchInput.current?.focus();
      } else if (!typing && event.key.toLowerCase() === "r") resetView();
      else if (!typing && event.key.toLowerCase() === "g") setView("globe");
      else if (!typing && event.key.toLowerCase() === "l") setView("list");
      else if (!typing && event.key.toLowerCase() === "f") setShowFilters(true);
      else if (!typing && event.key === "?") setShowHelp((visible) => !visible);
    };
    window.addEventListener("popstate", restoreUrl);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("popstate", restoreUrl);
      window.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(rippleTimer.current);
    };
  }, []);
  const visibleCountries = unique(results.map((person) => person.country));
  const visibleConnections = connections.filter((connection) => results.some((person) => person.id === connection.sourceId || person.id === connection.targetId));
  const relatedConnections = selected ? connections.filter((connection) => connection.sourceId === selected.id || connection.targetId === selected.id) : visibleConnections;
  const statTitle = selected?.name ?? (filters.sdg ? sdgByNumber.get(Number(filters.sdg))?.name : filters.country ?? "Global network");
  return <div className="explorer-app">
    <main className="workspace">
      <aside className="explore-sidebar"><div className="sidebar-inner">
        <div className="sidebar-brand"><div className="brand-mark"><Globe2 size={18} strokeWidth={1.6} /></div><div className="brand-copy"><span className="brand-name">Common Ground</span><span className="brand-caption">Global changemakers map</span></div></div>
        <div className="sidebar-intro"><h1>People making<br /><em>a difference.</em></h1><p>Discover changemakers and the ideas shaping communities across the Global South.</p></div>
        <div className="sidebar-tools"><label className="search-field"><input ref={searchInput} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search changemakers" aria-label="Search changemakers" /><Search size={16} className="search-icon" />{search && <Button variant="ghost" size="icon" className="search-clear" onClick={() => setSearch("")} aria-label="Clear search"><X size={14} /></Button>}</label>
          <button type="button" className="mobile-filter-toggle" aria-expanded={showFilters} aria-controls="explorer-filters" onClick={() => setShowFilters((visible) => !visible)}>Filters<ChevronDown size={14} className={showFilters ? "rotate-icon" : ""} /></button>
        </div>
        <div className="filters-panel" id="explorer-filters"><div className="filters-heading"><span>Narrow it down</span>{activeFilterCount > 0 && <button type="button" className="clear-button" onClick={clearFilters}>Clear all</button>}</div><div className={`filter-grid ${showFilters ? "filter-grid--open" : ""}`}><SelectFilter label="Category" value={filters.category} onChange={setFilter("category")} choices={options.category.map((value) => ({ value, label: value }))} /><SelectFilter label="Region" value={filters.region} onChange={setFilter("region")} choices={options.region.map((value) => ({ value, label: value }))} /><SelectFilter label="SDG" value={filters.sdg} onChange={setFilter("sdg")} choices={options.sdg.map((number) => ({ value: String(number), label: `${number} · ${sdgByNumber.get(number)?.name ?? "SDG"}` }))} /><SelectFilter label="Country" value={filters.country} onChange={setFilter("country")} choices={countryChoices} /></div>{activeFilterCount > 0 && <div className="active-tag-row">{Object.entries(filters).filter(([, value]) => value).map(([key, value]) => <button type="button" className="active-tag" key={key} onClick={() => setFilter(key as keyof typeof filters)("")}><span>{key === "sdg" ? `SDG ${value}` : value}</span><X size={12} /></button>)}</div>}</div>
      </div></aside>
      <section className={`main-stage ${view === "list" ? "main-stage--list" : ""}`} aria-label="Changemakers explorer">
        <div className="top-controls"><div className="mode-control" role="group" aria-label="Explorer mode">{(["explore", "network"] as ExplorerMode[]).map((item) => <button key={item} type="button" className={mode === item ? "mode-pill active" : "mode-pill"} aria-pressed={mode === item} onClick={() => setMode(item)}>{item[0]!.toUpperCase() + item.slice(1)}</button>)}</div><div className="toolbar-cluster"><div className="view-toggle" role="group" aria-label="View mode"><button type="button" className={view === "globe" ? "view-pill active" : "view-pill"} onClick={() => setView("globe")} aria-pressed={view === "globe"}>Globe</button><button type="button" className={view === "list" ? "view-pill active" : "view-pill"} onClick={() => setView("list")} aria-pressed={view === "list"}>List</button></div><div className="toolbar-actions"><Link to="/admin" className="admin-profile" title="Go to admin dashboard" aria-label="Go to admin dashboard"><span className="admin-profile-avatar" aria-hidden="true">A</span><span className="admin-profile-name">Admin</span></Link></div></div></div>
        {view === "globe" && (
          <>
            <div className="globe-background">
              <GlobeExplorer people={results} connections={connections} selectedId={selectedId} focusVersion={focusVersion} resetVersion={resetVersion} networkMode={mode === "network"} onSelect={selectPerson} onConnection={setDetail} onFallback={() => setView("list")} />
            </div>
            <div className="stage-status-bar">
              <span className="status-hint"><Compass size={14} />Drag to rotate · scroll to zoom</span>
              <span className="status-title">{statTitle}</span>
              <span className="status-stats">
                {selected ? <>{selected.sdgs.length} SDGs · {relatedConnections.length} connection{relatedConnections.length !== 1 ? "s" : ""} · {selected.country}</> : <>{results.length} people · {visibleCountries.length} countries · {new Set(results.flatMap((person) => person.sdgs)).size} SDGs · {relatedConnections.length} connections</>}
              </span>
              {focusPoint && <span className="status-coords" title={focusPoint.label}>{formatCoordinate(focusPoint.latitude, "N", "S")}&nbsp;&nbsp;{formatCoordinate(focusPoint.longitude, "E", "W")}</span>}
            </div>
            {rippleMessage && <div className="ripple-status" role="status"><Sparkles size={14} />Following the ripple <span>{rippleMessage}</span></div>}
          </>
        )}
        {view === "list" && (
          <div className="list-stage">
            <div className="list-summary">
              <span>{results.length} {results.length === 1 ? "changemaker" : "changemakers"}</span>
              <span>Across {visibleCountries.length} {visibleCountries.length === 1 ? "country" : "countries"}</span>
            </div>
            {results.length ? (
              <div className="list-grid">
                {results.map((person, index) => (
                  <Button variant="ghost" className="list-person" key={person.id} onClick={() => selectPerson(person.id)}>
                    <span className="list-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="list-person-main">
                      <span className="list-person-category"><CategoryDot category={person.category} />{person.category}</span>
                      <strong>{person.name}</strong>
                      <small>{person.organization}</small>
                      <span className="list-person-location"><MapPin size={13} />{person.city}, {person.country}</span>
                    </span>
                    <ArrowUpRight className="list-arrow" size={19} />
                  </Button>
                ))}
              </div>
            ) : <div className="list-empty">No changemakers match your search.</div>}
          </div>
        )}
      </section>
      {selected && <ProfilePanel person={selected} onClose={closeProfile} onSelect={selectPerson} onConnection={setDetail} onFollowRipple={followRipple} />}
    </main>
    {detail && <div className="modal-backdrop" onMouseDown={() => setDetail(null)}><div className="connection-modal" role="dialog" aria-modal="true" aria-label="Connection details" onMouseDown={(event) => event.stopPropagation()}><div className="modal-top"><span className="eyebrow">THE CONNECTION / {detail.id.toUpperCase()}</span><Button variant="ghost" size="icon" className="icon-button" onClick={() => setDetail(null)} aria-label="Close connection details"><X size={19} /></Button></div><div className="modal-icon"><Network size={26} /></div><span className="section-label">RELATIONSHIP TYPE</span><h2>{detail.type}</h2><p>{detail.description}</p><div className="modal-people">{[detail.sourceId, detail.targetId].map((id, index) => { const person = changemakers.find((p) => p.id === id); if (!person) return null; return <div key={id}>{index > 0 && <span className="modal-link">↔</span>}<span>{person.name}<small>{person.city}, {person.country}</small></span></div>; })}</div><Button variant="secondary" className="modal-action" onClick={() => selectPerson(detail.targetId)}>Explore {changemakers.find((person) => person.id === detail.targetId)?.name ?? "changemaker"} <ArrowRight size={16} /></Button></div></div>}
    {showHelp && <div className="modal-backdrop help-backdrop" onMouseDown={() => setShowHelp(false)}><section className="shortcuts-panel" role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" onMouseDown={(event) => event.stopPropagation()}><div className="modal-top"><span className="eyebrow">QUICK KEYS</span><Button variant="ghost" size="icon" className="icon-button" onClick={() => setShowHelp(false)} aria-label="Close keyboard shortcuts"><X size={18} /></Button></div><h2>Move through the map</h2><div><span>Search</span><kbd>/</kbd><span>Close panel</span><kbd>Esc</kbd><span>Reset view</span><kbd>R</kbd><span>Globe / List</span><kbd>G / L</kbd><span>Open filters</span><kbd>F</kbd></div></section></div>}
  </div>;
}