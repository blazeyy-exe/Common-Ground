# Common Ground

An interactive atlas of changemakers: the people, organizations, and
relationships behind community-led work across the Global South.

Open the app and you get a WebGL globe of every person in the collection.
Filter by SDG, region, country, or category, open a profile, and follow
the connections between people. The explorer is client-rendered, so moving
between views never costs a round trip and any view can be shared as a URL.

## What's in it

### Globe
- 3D globe rendered with React Three Fiber, drawn from a bundled world topology
  so there is no tile server or map API key to manage
- one marker per changemaker, coloured by category, sized and highlighted on
  selection
- connection arcs between linked people, with the relationship type on hover
- country hover states that report how many changemakers sit in that country
- camera fly-to when a profile opens
- automatic list-view fallback on devices without WebGL

### Explorer
- keyword search across name, city, country, organization, category, and focus
  areas
- filters for SDG, category, region, and country, with the active set shown as
  removable chips
- four modes: Explore, Network, SDGs, and Places
- share button that copies the current view, and a status bar that reports how
  many people, countries, and SDGs are on screen
- keyboard shortcuts: `/` search, `Esc` close, `R` reset, `G`/`L` globe or list,
  `F` filters, `?` shortcut sheet

### Profiles
- slide-in panel with organization, bio, focus areas, SDG badges, and the
  person's connections
- "Follow the ripple" walks from one changemaker to a connected one

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19, TypeScript, Lucide icons |
| Build | Vite 8, Nitro (Cloudflare Workers bundle by default) |
| App shell | TanStack Start + TanStack Router, TanStack Query provider |
| Globe | React Three Fiber, drei, three, `d3-geo`, `topojson-client` |
| Styling | Tailwind CSS v4 with a custom token layer in `src/styles.css` |
| Primitives | shadcn-style `Button` (Radix Slot + class-variance-authority) |

## Getting started

Requires Bun 1.1+ (`npm` works too, the scripts are plain Vite commands).

```bash
bun install
bun run dev
```

The dev server prints its URL (Vite's default port is 5173).

## Scripts

| Script | What it does |
| --- | --- |
| `bun run dev` | Vite dev server with HMR |
| `bun run build` | Client + SSR build, then the Nitro server bundle in `.output/` |
| `bun run build:dev` | Same build with `mode=development` for readable stacks |
| `bun run preview` | Serve the production build locally |
| `bun run typecheck` | `tsc --noEmit` over the app and config |
| `bun run lint` | ESLint (TypeScript, React hooks, Prettier) |
| `bun run format` | Prettier write |


## Project layout

```text
public/                   favicon set + robots.txt
src/
  components/
    GlobeExplorer.tsx     globe, markers, arcs, camera focus
    ui/button.tsx         button primitive shared by every control
  data/
    changemakers.ts       the people in the atlas (typed records)
    connections.ts        relationships between people
    places.ts             region and country taxonomy for the filters
    sdgs.ts               official SDG names and colours
    world-atlas.json      compact world topology used to draw the globe
  lib/
    client-error-reporting.ts  error-boundary reporting hook
    error-capture.ts           keeps the original Error when h3 swallows it
    error-page.ts              last-resort HTML for a failed SSR render
    utils.ts                   `cn()` class merge helper
  routes/
    __root.tsx            document shell, 404 and error views
    index.tsx             the explorer (state, filters, panels, list)
  router.tsx              router instance and query client
  start.ts                request middleware (error + CSRF)
  server.ts               SSR entry wrapper
  styles.css              design tokens and explorer styles
```

## Data model

Everything the explorer renders is derived from `src/data`, so adding a person
never means touching a component.

`changemakers.ts` holds the records: `id`, `name`, `city`, `country`, `region`,
`latitude`, `longitude`, `category`, `sdgs`, `organization`, `bio`, and
`focusAreas`. `categoryColor()` maps a category onto the marker palette so the
list, the category dots, and the globe agree on colour.

`connections.ts` links two changemakers with a `type` and a one-line
`description`. Both ids must exist in `changemakers.ts`; the globe draws an arc
only when both ends resolve.

The profiles are illustrative editorial entries rather than verbatim press
biographies, and each coordinate pair is the approximate centre of the city the
person works from.

## Design system

`src/styles.css` is the only stylesheet. It has two layers:

1. **Brand tokens** (`--surface-*`, `--text-*`, `--accent-*`) are the palette
   every explorer rule reads from.
2. **Semantic tokens** (`--background`, `--primary`, `--muted-foreground`, …)
   alias the brand tokens and are registered under `@theme inline`, which is what
   turns them into Tailwind utilities like `bg-primary` or `border-input`.

The explorer is dark only, so there is no light/dark swap to maintain. Lightning
CSS compiles the sheet, which keeps the `oklab()`/`oklch()` colour work and the
vendor prefixing consistent across browsers.

## How the globe is built

`src/data/world-atlas.json` is a compact TopoJSON file, converted to GeoJSON at
runtime with `topojson-client`. Land is painted once into an offscreen 2048×1024
canvas using an equirectangular projection, then used as the sphere texture. The
projection is rotated so its seam sits at 90°W and stays behind the camera's
default framing.

Markers are placed by projecting latitude/longitude onto the sphere in
`globePoint()`. The palette is read from the CSS custom properties at mount, so
the globe follows the theme instead of hard-coding colours in the WebGL layer.
Country hit-testing uses `geoContains`, which keeps the hover counts correct
without a second geometry pass.

## Deployment

`bun run build` writes a self-contained bundle to `.output/`:

- `.output/public` — static client assets
- `.output/server` — the Nitro server entry (Cloudflare Workers module by
  default, with `wrangler.json` generated for you)

Deploy with `npx nitro deploy --prebuilt` from `.output`, or point your platform
at the build and set `NITRO_PRESET` (for example `node-server`, `vercel`,
`netlify`) to target something other than Cloudflare Workers.

## Quality notes

- WebGL is optional: the globe falls back to a list view and tells the visitor
  why, and the whole experience stays usable on a phone.
- `prefers-reduced-motion` disables the panel animations and transitions.
- Every control has a label, focus outlines are kept visible, and the globe,
  panels, and modals carry ARIA roles.
- Device pixel ratio is clamped on the canvas so high-density screens don't need
  to render at full resolution.

## Contributing

Working notes for contributors and agents live in [AGENTS.md](./AGENTS.md). The
short version: records go in `src/data`, presentation goes through the tokens in
`src/styles.css` plus the class vocabulary in `src/routes/index.tsx`, and the
production build must stay green.
