/**
 * Date helpers for the admin UI.
 *
 * `toLocaleDateString()` with no locale argument resolves against the host's
 * default locale, so the server rendered `8/21/2025` (en-US) while the client
 * rendered `21/08/2025` (en-GB) for the same instant. That text mismatch is a
 * hydration error, and React responds by discarding the server HTML and
 * re-rendering the whole route on the client.
 *
 * Pinning the locale (and the time zone) makes the markup byte-identical on
 * both sides. Dates here are admin/audit metadata, not user-local time, so a
 * fixed presentation is the right trade for deterministic rendering.
 */

const LOCALE = "en-GB";
const TIME_ZONE = "UTC";

const dayFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TIME_ZONE,
});

const longDayFormatter = new Intl.DateTimeFormat(LOCALE, {
  weekday: "long",
  month: "long",
  day: "numeric",
  timeZone: TIME_ZONE,
});

const dateTimeFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

/** `21/08/2025` — stable regardless of server/client locale. */
export function formatDay(iso: string | Date): string {
  return dayFormatter.format(typeof iso === "string" ? new Date(iso) : iso);
}

/** `Thursday, 27 August 2026` — stable regardless of server/client locale. */
export function formatLongDay(value: Date): string {
  return longDayFormatter.format(value);
}

/** `21/08/2025, 14:05` — stable regardless of server/client locale. */
export function formatDateTime(iso: string | Date): string {
  return dateTimeFormatter.format(typeof iso === "string" ? new Date(iso) : iso);
}

/** Thousands separator, pinned so grouping never differs either. */
const numberFormatter = new Intl.NumberFormat(LOCALE);

export function formatCount(value: number): string {
  return numberFormatter.format(value);
}
