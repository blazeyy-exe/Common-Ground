# Common Ground

An interactive atlas of changemakers — the people, organizations, and relationships behind community-led work across the Global South.

**502** changemakers · **181** countries · **121** relationships

A WebGL globe (with a flat-map fallback) lets you filter by SDG, region, country, or category, open profiles, and trace connections between people. An admin dashboard at `/admin` handles review and verification. The app is fully client-rendered, so every view is a shareable URL and navigation never costs a round trip.

---

## Features

**Globe**
Markers colored by category, animated connection arcs, country hover stats, camera fly-to on profile open, idle auto-rotate, and a custom atmosphere shader — all rendered from a bundled 105 KB world topology (no tile server or API key needed).

**Map**
The same topology as an SVG flat map — pan, zoom, hover — for lower-powered devices or a conventional cartographic view. Loads automatically under 700px width or when WebGL is unavailable.

**Explorer**
Keyword search, filters (SDG, category, region, country) with removable chips, an Explore/Network view toggle, and full state persisted in the URL. Keyboard shortcuts: `/` search · `Esc` close · `R` reset · `G` globe · `M` map · `F` filters · `?` help.

**Profiles**
Slide-in panel with bio, focus areas, SDG badges, and connections — including a "follow the ripple" walk to linked changemakers.

**Admin dashboard** (`/admin`)
Overview stats, a paginated/filterable changemaker table, a verification queue (pending / needs changes / verified), and full profile detail with history — all backed by an in-memory context (no backend yet).

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19, TypeScript |
| Build | Vite 8, Nitro (Cloudflare Workers by default) |
| App shell | TanStack Start + Router + Query |
| Globe | React Three Fiber, drei, three, d3-geo, topojson-client |
| Styling | Tailwind CSS v4, custom tokens |

## Getting started

```bash
bun install
bun run dev
```

Requires Bun 1.1+ (npm works too). Dev server runs on Vite's default port, 5173.

| Script | Purpose |
|---|---|
| `dev` | Dev server with HMR |
| `build` | Production build → `.output/` |
| `preview` | Serve the production build |
| `typecheck` | `tsc --noEmit` |
| `lint` | ESLint |
| `format` | Prettier |

There's no test suite — `typecheck`, `lint`, and `build` are the gate.

## Routes

| Path | Renders |
|---|---|
| `/` | The explorer (client-rendered) |
| `/admin` | Dashboard overview |
| `/admin/changemakers` | Changemaker table |
| `/admin/changemakers/$id` | Single profile (admin) |
| `/admin/verification` | Review queue |

## Project layout

```text
src/
  admin/          admin UI, state, and derived metadata
  components/     GlobeExplorer, MapExplorer, SdgIcon, ui/
  data/           changemakers, connections, places, sdgs, world-atlas.json
  lib/            error handling, utils
  routes/         route tree (index, admin/*, __root)
  styles.css      design tokens + explorer styles
```

## Data model

Everything renders from `src/data` — adding a person never touches a component.

- **`changemakers.ts`** — core records (id, name, location, category, SDGs, bio, focus areas). Category colors are derived from the data itself.
- **`connections.ts`** — relationships between two changemaker ids; an arc only draws once both ends resolve.
- **`places.ts`** — region/country taxonomy (193 UN members + Palestine, Holy See, Taiwan).
- **`sdgs.ts`** / **`sdgAnimations.ts`** — the 17 SDG names, colors, and Lottie animations.

> Profiles are illustrative editorial entries, not verbatim biographies; connections are synthetic.

**Admin data** is derived, not stored: `adminMeta.ts` seeds a PRNG from each person's `id` to generate stable verification/status/reviewer fields, so numbers stay consistent across reloads without a backend.

## Design system

One stylesheet (`src/styles.css`), two layers: brand tokens (raw palette) and semantic tokens (`--background`, `--primary`, etc.) that Tailwind picks up via `@theme inline`. The admin dashboard reads the same tokens, so both surfaces stay visually in sync. Dark-mode only. Lightning CSS handles `oklch()`/`oklab()` and prefixing.

## Deployment

```bash
bun run build
npx nitro deploy --prebuilt
```

Outputs a self-contained bundle to `.output/` (static client + Nitro server, Cloudflare Workers by default). Set `NITRO_PRESET` to target `node-server`, `vercel`, `netlify`, etc.

## Known gaps

- All data is synthetic demo data; nothing persists.
- No authentication — every `/admin` route is public.
- Several admin sidebar links (Organizations, Reports & Flags, Analytics, etc.) are placeholders.
- `getConnectionColor()` handles relationship types the current dataset doesn't use, so arcs all render in the default color.
- No test suite — `typecheck` / `lint` / `build` are the safety net.

## Contributing

See [AGENTS.md](./AGENTS.md) for details. In short: data lives in `src/data`, styling goes through `src/styles.css`, and the build must stay green.