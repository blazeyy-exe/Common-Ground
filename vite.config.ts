import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type PluginOption } from "vite";

/** Packages that must resolve to a single copy across the SSR/client split. */
const dedupedPackages = [
  "react",
  "react-dom",
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "@tanstack/react-query",
  "@tanstack/query-core",
];

export default defineConfig(({ command }) => {
  const plugins: PluginOption[] = [
    // Tailwind reads the design tokens straight out of src/styles.css.
    tailwindcss(),
    tanstackStart({
      // src/server.ts wraps the SSR entry so catastrophic h3 failures render our
      // own error page instead of a bare JSON 500.
      server: { entry: "server" },
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    // Nitro turns the SSR output into a deployable bundle and only runs for
    // builds; dev is served straight from Vite. Cloudflare Workers is the
    // default target and an explicit NITRO_PRESET still takes precedence.
    ...(command === "build"
      ? [
          nitro({
            defaultPreset: "cloudflare-module",
            cloudflare: { nodeCompat: true, deployConfig: true },
          }),
        ]
      : []),
    react(),
  ];

  return {
    // Lightning CSS compiles the token-heavy stylesheet: custom properties,
    // oklab()/oklch() colors, and prefixing for the browser support matrix.
    css: { transformer: "lightningcss" },
    resolve: {
      // `@/…` imports come from the paths block in tsconfig.json.
      tsconfigPaths: true,
      dedupe: dedupedPackages,
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "react-dom/client",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
      ],
      ignoreOutdatedRequests: true,
    },
    plugins,
  };
});
