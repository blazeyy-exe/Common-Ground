# Common Ground

Common Ground is an interactive explorer for changemakers, communities, and the connections that link action across the Global South. The app presents a curated atlas of people, organizations, and ideas through an explorable globe, network view, and searchable profile system.

## Overview

This project combines narrative storytelling with interactive data exploration. Users can:

- browse changemakers by region, country, category, and SDG
- search by name, city, organization, focus area, and category
- switch between globe and list views
- explore connection lines between people and organizations
- inspect detailed profile panels with background, focus areas, and SDG alignment

The experience is designed to feel editorial and immersive while remaining usable as a research and discovery tool.

## Why this project exists

The app is built around the idea that meaningful work often appears as distributed, locally rooted action rather than a single headline story. Common Ground makes those relationships visible by turning a set of people and connections into a map of ideas, networks, and shared impact.

## Main features

### Interactive globe explorer
- 3D globe rendered with React Three Fiber
- geographic markers for changemakers using latitude and longitude data
- connection arcs between linked people
- camera focus behavior that centers on the selected changemaker
- fallback list view for devices or contexts where WebGL is unavailable

### Explorer filters and search
- keyword search for changemakers and their context
- filters for SDG, category, region, and country
- URL-state synchronization so filters and selected profiles can be shared via the address bar
- clearable filter controls and quick-explore suggestions

### Profile and network detail
- profile side panel for each changemaker
- organization and bio context
- SDG badges and focus area tags
- connection cards that reveal relevant relationships between people

### Modes
- Explore mode for browsing the map
- Network mode for relationship-heavy views
- SDGs mode for agenda-focused filtering
- Places mode for location-based discovery

## Tech stack

- React 19
- TypeScript
- Vite
- TanStack Router
- React Three Fiber
- Drei
- d3-geo and topojson-client
- Tailwind-inspired design system with custom CSS
- Lucide React icons

## Project structure

```text
.
├── public/
│   └── robots.txt
├── src/
│   ├── components/
│   │   ├── GlobeExplorer.tsx
│   │   └── ui/
│   ├── data/
│   │   ├── changemakers.ts
│   │   ├── connections.ts
│   │   ├── sdgs.ts
│   │   └── world-atlas.json
│   ├── lib/
│   ├── routes/
│   ├── styles.css
│   ├── router.tsx
│   ├── routeTree.gen.ts
│   ├── server.ts
│   └── start.ts
├── AGENTS.md
├── bunfig.toml
├── components.json
├── eslint.config.js
├── package.json
├── README.md
├── roadmap.md
├── tsconfig.json
├── vite.config.ts
└── ...
```

## Data model

The core data lives in the `src/data` folder.

- `changemakers.ts` contains the changemaker records with fields such as:
  - `id`
  - `name`
  - `city`
  - `country`
  - `region`
  - `latitude`
  - `longitude`
  - `category`
  - `sdgs`
  - `organization`
  - `bio`
  - `focusAreas`
- `connections.ts` defines the relationships between changemakers
- `sdgs.ts` contains the SDG metadata used for badges and labels
- `world-atlas.json` is used to draw the globe landmass surface

## Local development

### Prerequisites

- Node.js 18+
- npm or Bun

### Install dependencies

Using npm:

```bash
npm install
```

Using Bun:

```bash
bun install
```

### Run the app in development mode

```bash
npm run dev
```

or:

```bash
bun run dev
```

The app will start in a local Vite dev server, usually on port 5173 or a nearby available port.

### Production build

```bash
npm run build
```

or:

```bash
bun run build
```

### Linting

```bash
npm run lint
```

or:

```bash
bun run lint
```

## Scripts

From `package.json`:

- `npm run dev` or `bun run dev` — start the app locally
- `npm run build` or `bun run build` — produce a production build
- `npm run build:dev` — build in development mode
- `npm run preview` — preview the production build locally
- `npm run lint` — run ESLint
- `npm run format` — run Prettier formatting

## Notes on architecture

- The app uses client-side routing via TanStack Router.
- The route entry is defined in `src/routes/index.tsx`.
- The interactive globe is isolated in `src/components/GlobeExplorer.tsx`.
- The visual system is primarily defined in `src/styles.css` and uses a dark editorial palette with green accents and a map-like interface.
- Global state for the explorer is managed within the route component rather than a separate store.

## Contribution notes

If you are expanding the project, the easiest places to work are:

- `src/data/changemakers.ts` for new changemaker profiles
- `src/data/connections.ts` for relationship data
- `src/routes/index.tsx` for explorer behavior and filters
- `src/components/GlobeExplorer.tsx` for globe rendering and interaction
- `src/styles.css` for layout and visual changes

## Project status

This repository is a front-end experience focused on interactive storytelling and geographic exploration. It is designed for visual browsing and research-oriented discovery rather than a traditional CRUD app or backend-powered dashboard.

## Repository note

This project is configured for a Vite + React + TypeScript stack and includes a TanStack Start app shell. There is no explicit license field in `package.json` at the moment, so repository licensing should be confirmed before commercial reuse.
