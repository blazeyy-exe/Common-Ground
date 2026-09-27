import { currentAdmin } from "../data/session";

function Bar({ width, className = "" }: { width: string; className?: string }) {
  return (
    <div
      className={`h-2.5 animate-pulse rounded bg-muted motion-reduce:animate-none ${className}`}
      style={{ width }}
    />
  );
}

/**
 * Shown while the `/admin` route match is still pending.
 *
 * The dashboard's own pages can't render yet, and the route they replace — the
 * 3D globe on `/` — is a canvas that sits frozen on screen while React works.
 * A stale-looking stage reads as "the click didn't land", so this draws the
 * admin chrome (sidebar, header, stat cards) immediately. It is pure static
 * markup with no data or context dependencies, so it paints on the first frame
 * and is swapped for the real layout as soon as that mounts.
 */
export function AdminPending() {
  return (
    <div
      className="flex h-dvh min-h-0 bg-background text-foreground"
      role="status"
      aria-busy="true"
      aria-label="Loading the admin dashboard"
    >
      <div className="hidden w-[240px] shrink-0 flex-col gap-6 border-r border-border bg-secondary/40 p-5 lg:flex">
        <div>
          <p className="text-sm font-semibold text-foreground">Common Ground</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Admin
          </p>
        </div>
        <div className="flex flex-col gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <Bar key={index} width={`${58 + ((index * 13) % 34)}%`} />
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-background/95 px-5 py-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground">
              Welcome back, {currentAdmin.name}
            </h1>
            <p className="text-xs text-muted-foreground">Opening your dashboard…</p>
          </div>
          <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-foreground sm:flex">
            {currentAdmin.initials}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden">
          <div className="mx-auto w-full max-w-[1600px] px-5 py-6 lg:px-8">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="rounded-lg border border-border p-4">
                  <Bar width="45%" className="mb-3" />
                  <Bar width="70%" className="!h-4" />
                </div>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
              {Array.from({ length: 2 }, (_, index) => (
                <div key={index} className="h-48 rounded-lg border border-border p-4">
                  <Bar width="35%" />
                  <div className="mt-5 flex flex-col gap-3">
                    {Array.from({ length: 5 }, (_, row) => (
                      <Bar key={row} width={`${45 + ((row * 17) % 45)}%`} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
