import { useEffect, useState, type ComponentType } from "react";

import { sdgs } from "@/data/sdgs";
import { sdgAnimations } from "../data/sdgAnimations";

type LottieProps = {
  options: { loop?: boolean; autoplay?: boolean; animationData: object };
  height?: number | string;
  width?: number | string;
};

let lottiePromise: Promise<ComponentType<LottieProps> | null> | null = null;

/**
 * `react-lottie` is CommonJS (`exports.default = Lottie`, `main: dist/index.js`).
 * Depending on how the bundler interops it, the resolved namespace can be the
 * component itself, a `{ default: Lottie }` wrapper, or a double-nested one.
 * Rendering the wrapper object throws React's "Element type is invalid", which
 * took down the whole route. So resolve the first thing that is actually a
 * component and treat anything else as "unavailable" -> keep the badge.
 */
function resolveLottieComponent(mod: unknown): ComponentType<LottieProps> | null {
  const candidates: unknown[] = [
    (mod as { default?: unknown } | null)?.default,
    (mod as { default?: { default?: unknown } } | null)?.default?.default,
    mod,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "function") return candidate as ComponentType<LottieProps>;
    // React.forwardRef / memo objects expose a `$$typeof` symbol instead of
    // being callable; accept those as valid component types too.
    if (
      candidate &&
      typeof candidate === "object" &&
      "$$typeof" in (candidate as Record<string, unknown>)
    ) {
      return candidate as ComponentType<LottieProps>;
    }
  }
  return null;
}

function loadLottie(): Promise<ComponentType<LottieProps> | null> {
  if (!lottiePromise) {
    // Dynamic, not static: react-lottie pulls in lottie-web, which touches
    // `document` the moment its module evaluates. A top-level `import` would
    // crash this app's SSR render; loading it lazily keeps it client-only.
    lottiePromise = import("react-lottie")
      .then(resolveLottieComponent)
      .catch((error: unknown) => {
        // Never let a failed animation load take the page down with it.
        console.warn("SdgIcon: react-lottie failed to load, using badge fallback.", error);
        return null;
      });
  }
  return lottiePromise;
}

/**
 * Renders the official UN SDG icon as an animated Lottie once the client has
 * loaded react-lottie. Server-rendered and first-paint output is the colored
 * number badge, so there is no layout shift, and if react-lottie fails to load
 * for any reason the badge simply stays — it never takes the page down.
 */
export function SdgIcon({ number, size = 40 }: { number: number; size?: number }) {
  const [Lottie, setLottie] = useState<ComponentType<LottieProps> | null>(null);
  const animationData = sdgAnimations[number];
  const sdg = sdgs.find((candidate) => candidate.number === number);

  useEffect(() => {
    let cancelled = false;
    loadLottie().then((Component) => {
      if (!cancelled) setLottie(() => Component);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Lottie || !animationData) {
    return (
      <span
        aria-hidden="true"
        className="inline-flex shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
        style={{ width: size, height: size, backgroundColor: sdg?.color ?? "#333" }}
      >
        {number}
      </span>
    );
  }

  return (
    <span
      style={{ width: size, height: size, display: "inline-block" }}
      role="img"
      aria-label={`SDG ${number}${sdg ? `: ${sdg.name}` : ""}`}
    >
      <Lottie options={{ loop: true, autoplay: true, animationData }} height={size} width={size} />
    </span>
  );
}
