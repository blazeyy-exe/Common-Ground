import { Link } from "@tanstack/react-router";
import { ArrowRight, ShieldCheck } from "lucide-react";

import { connections } from "@/data/connections";
import { sdgs } from "@/data/sdgs";
import { EmptyState } from "../components/EmptyState";
import { SdgIcon } from "@/components/SdgIcon";
import { StatCard } from "../components/StatCard";
import { VerificationBadge } from "../components/StatusBadge";
import { formatCount, formatDay } from "../lib/format";
import { useAdminData } from "../state/AdminDataContext";

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDay(iso);
}

export function OverviewPage() {
  const { people, activity } = useAdminData();

  const verifiedCount = people.filter((p) => p.admin.verificationStatus === "verified").length;
  const pendingCount = people.filter((p) => p.admin.verificationStatus === "pending").length;
  const needsChangesCount = people.filter((p) => p.admin.verificationStatus === "needs_changes").length;
  const attentionCount = pendingCount + needsChangesCount;

  const countries = new Set(people.map((p) => p.country));
  const regions = new Set(people.map((p) => p.region));

  const sdgCounts = new Map<number, number>();
  for (const person of people) {
    for (const sdgNumber of person.sdgs) {
      sdgCounts.set(sdgNumber, (sdgCounts.get(sdgNumber) ?? 0) + 1);
    }
  }
  const topSdgs = [...sdgCounts.entries()].sort((a, b) => b[1] - a[1]);
  const maxSdgCount = topSdgs[0]?.[1] ?? 1;

  const countryCounts = new Map<string, number>();
  for (const person of people) {
    countryCounts.set(person.country, (countryCounts.get(person.country) ?? 0) + 1);
  }
  const topCountries = [...countryCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCountryCount = topCountries[0]?.[1] ?? 1;

  const attentionItems = people
    .filter((p) => p.admin.verificationStatus === "pending" || p.admin.verificationStatus === "needs_changes")
    .sort((a, b) => {
      if (a.admin.priority === b.admin.priority) return 0;
      return a.admin.priority === "high" ? -1 : 1;
    })
    .slice(0, 6);

  const recentActivity = activity.slice(0, 6);

  // Lightweight signup trend over the last 12 weeks, bucketed from joinedAt.
  const weeks = 12;
  const buckets = new Array(weeks).fill(0) as number[];
  const now = Date.now();
  for (const person of people) {
    const ageMs = now - new Date(person.admin.joinedAt).getTime();
    const weekIndex = weeks - 1 - Math.min(weeks - 1, Math.floor(ageMs / (7 * 24 * 60 * 60 * 1000)));
    // Bounds-check both ends: `noUncheckedIndexedAccess` makes the read
    // `number | undefined`, and a future joinedAt would otherwise wrap negative.
    if (weekIndex >= 0 && weekIndex < weeks) {
      buckets[weekIndex] = (buckets[weekIndex] ?? 0) + 1;
    }
  }
  const maxBucket = Math.max(1, ...buckets);

  return (
    <div className="flex flex-col gap-8 pb-12">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-2">
          <StatCard
            size="large"
            label="Total changemakers"
            value={formatCount(people.length)}
            helper={`Across ${countries.size} countries, ${regions.size} regions`}
          />
        </div>
        <StatCard
          label="Verified"
          value={`${people.length ? Math.round((verifiedCount / people.length) * 100) : 0}%`}
          helper={`${attentionCount} awaiting review`}
        />
        <StatCard label="Network connections" value={formatCount(connections.length)} />
        <StatCard
          label="SDG coverage"
          value={`${sdgCounts.size} / 17`}
          {...(topSdgs[0] ? { helper: `Most represented: SDG ${topSdgs[0][0]}` } : {})}
        />
        <StatCard label="Global reach" value={`${countries.size} countries`} helper={`${regions.size} regions`} />
        <StatCard
          label="Organizations referenced"
          value={formatCount(new Set(people.map((p) => p.organization)).size)}
        />
      </section>

      <section className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Attention required</h2>
            <p className="text-xs text-muted-foreground">{attentionCount} items need admin action</p>
          </div>
          <Link to="/admin/verification" className="flex items-center gap-1 text-xs font-medium text-primary">
            View queue <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {attentionItems.length === 0 ? (
          <div className="p-4">
            <EmptyState
              icon={ShieldCheck}
              title="You're all caught up"
              description="No profiles currently need verification review."
            />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {attentionItems.map((person) => (
              <div key={person.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{person.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {person.city}, {person.country} · {timeAgo(person.admin.joinedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <VerificationBadge status={person.admin.verificationStatus} />
                  {person.admin.priority === "high" && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-destructive">High</span>
                  )}
                  <Link
                    to="/admin/changemakers/$id"
                    params={{ id: person.id }}
                    className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
                  >
                    Review
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border p-4 lg:col-span-2">
          <h2 className="text-sm font-semibold text-foreground">Network growth</h2>
          <p className="text-xs text-muted-foreground">Changemakers joined, last 12 weeks</p>

          <div className="mt-5 flex h-32 items-end gap-1.5">
            {buckets.map((count, index) => (
              <div
                key={index}
                className="flex-1 rounded-t bg-primary/70"
                style={{ height: `${Math.max(4, (count / maxBucket) * 100)}%` }}
                title={`${count} joined`}
              />
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border p-4">
          <h2 className="text-sm font-semibold text-foreground">Top countries</h2>
          <div className="mt-4 flex flex-col gap-3">
            {topCountries.map(([country, count]) => (
              <div key={country} className="flex items-center gap-3">
                <span className="w-20 shrink-0 truncate text-xs text-muted-foreground">{country}</span>
                <div className="h-1.5 flex-1 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(count / maxCountryCount) * 100}%` }} />
                </div>
                <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border p-4">
        <h2 className="text-sm font-semibold text-foreground">SDG distribution</h2>
        <p className="text-xs text-muted-foreground">Changemakers by Sustainable Development Goal</p>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sdgs.map((sdg) => {
            const count = sdgCounts.get(sdg.number) ?? 0;
            return (
              <div key={sdg.number} className="flex items-center gap-2.5 rounded-md border border-border px-2.5 py-2">
                <SdgIcon number={sdg.number} size={24} />
                <span className="min-w-0 flex-1 truncate text-xs text-foreground">{sdg.name}</span>
                <div className="h-1 w-12 shrink-0 rounded-full bg-muted">
                  <div
                    className="h-1 rounded-full"
                    style={{ width: `${(count / maxSdgCount) * 100}%`, backgroundColor: sdg.color }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right text-xs text-muted-foreground">{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-border">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
          <span className="text-xs text-muted-foreground">Full log coming soon</span>
        </div>
        <div className="divide-y divide-border">
          {recentActivity.map((event) => (
            <div key={event.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <p className="text-xs text-foreground">
                <span className="font-medium">{event.admin}</span>{" "}
                <span className="text-muted-foreground">{event.summary}</span>
              </p>
              <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(event.at)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
