# Common Ground — working notes

Common Ground is a single-page explorer for changemakers, the organizations they
run, and the connections between them. It is a TanStack Start (Vite + React 19)
app that renders client-side and ships as a Nitro server bundle.

## Conventions

- Keep changemaker, connection, and SDG records in dedicated typed data modules
  (`src/data/*`) and derive the explorer UI and globe objects from them, so
  expanding the collection never requires component edits.
- Render the geographic globe client-side with React Three Fiber and the bundled
  compact world topology in `src/data/world-atlas.json`; this avoids external
  runtime map dependencies and keeps the explorer responsive.
- Style through the token system in `src/styles.css`. Brand tokens
  (`--surface-*`, `--text-*`, `--accent-*`) feed the semantic tokens that
  Tailwind utilities resolve through `@theme inline`.
- The profiles in `src/data/changemakers.ts` are editorial rather than verbatim
  press biographies. New records follow the same shape, and every entry in
  `connections.ts` must reference real `cm-*` ids on both sides.
- Keep the production build green. `bun run build` is the gate: it runs the
  TanStack Start build plus the Nitro Cloudflare bundle.
