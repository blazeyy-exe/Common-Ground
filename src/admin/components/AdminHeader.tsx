import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { currentAdmin } from "../data/session";
import { formatLongDay } from "../lib/format";

export function AdminHeader({ onMenuClick }: { onMenuClick: () => void }) {
  // Clock-derived text (greeting + today's date) cannot match between the
  // server render and the client, which throws a hydration mismatch and makes
  // React throw the whole tree away and rebuild it on the client. Render a
  // stable placeholder on the first pass, then fill in the real values once
  // mounted. `suppressHydrationWarning` is deliberately NOT used as a blanket
  // fix: it would only silence text, not the structural mismatch.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const today = now ? formatLongDay(now) : "";

  const hour = now ? now.getHours() : 12;
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/95 px-5 py-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {greeting}, {currentAdmin.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {today ? `${today} — ` : ""}here's what's happening across the network.
          </p>
        </div>
      </div>

      <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-secondary text-xs font-semibold text-foreground sm:flex">
        {currentAdmin.initials}
      </div>
    </header>
  );
}
