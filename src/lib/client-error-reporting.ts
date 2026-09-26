/**
 * Client-side error reporting used by the root error boundary.
 *
 * The explorer has no first-party error ingest. Instead of hard-coding a
 * vendor, this module normalises whatever the boundary caught and hands it to
 * a single well-known hook that any host page or monitoring snippet can
 * install. Nothing is sent anywhere unless something is listening.
 */

export type ClientErrorReport = {
  /** Human-readable summary, safe to show in a dashboard or log stream. */
  message: string;
  /** Stack trace when the thrown value was an Error. */
  stack?: string;
  /** Path the failure happened on. */
  filename: string;
  /** Extra caller context, e.g. the name of the boundary that caught it. */
  context: Record<string, unknown>;
};

export type ClientErrorReporter = (report: ClientErrorReport) => void;

declare global {
  interface Window {
    /** Optional sink provided by the page that embeds the explorer. */
    __commonGroundErrorReporting?: ClientErrorReporter;
  }
}

/**
 * Loaders and server functions commonly throw a raw `Response`, whose
 * `String()` form is the opaque `[object Response]`, so pull out the status and
 * URL instead.
 */
function describe(error: unknown): string {
  if (error instanceof Response) {
    return `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

export function reportError(error: unknown, context: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;

  const stack = error instanceof Error ? error.stack : undefined;
  const report: ClientErrorReport = {
    message: describe(error),
    ...(stack !== undefined && { stack }),
    filename: window.location.pathname,
    context,
  };

  window.__commonGroundErrorReporting?.(report);
  if (import.meta.env.DEV) console.error("[common-ground]", report.message, context, error);
}
