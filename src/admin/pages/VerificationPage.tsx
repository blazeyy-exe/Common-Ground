import { Flag, RotateCcw, ShieldCheck, X } from "lucide-react";
import { useMemo, useState } from "react";

import { EmptyState } from "../components/EmptyState";
import { SdgIcon } from "@/components/SdgIcon";
import { VerificationBadge } from "../components/StatusBadge";
import { useAdminData } from "../state/AdminDataContext";

type Tab = "pending" | "needs_changes" | "verified_today";

function isToday(iso: string): boolean {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return new Date(iso) >= startOfDay;
}

export function VerificationPage() {
  const { people, setVerificationStatus } = useAdminData();
  const [tab, setTab] = useState<Tab>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  const queue = useMemo(() => {
    if (tab === "pending") return people.filter((p) => p.admin.verificationStatus === "pending");
    if (tab === "needs_changes") return people.filter((p) => p.admin.verificationStatus === "needs_changes");
    return people.filter((p) => p.admin.verificationStatus === "verified" && isToday(p.admin.updatedAt));
  }, [people, tab]);

  const selected = queue.find((p) => p.id === selectedId) ?? queue[0] ?? null;

  const tabs: { key: Tab; label: string; count: number }[] = [
    {
      key: "pending",
      label: "Pending",
      count: people.filter((p) => p.admin.verificationStatus === "pending").length,
    },
    {
      key: "needs_changes",
      label: "Needs changes",
      count: people.filter((p) => p.admin.verificationStatus === "needs_changes").length,
    },
    {
      key: "verified_today",
      label: "Verified today",
      count: people.filter((p) => p.admin.verificationStatus === "verified" && isToday(p.admin.updatedAt)).length,
    },
  ];

  function decide(status: "verified" | "needs_changes" | "rejected") {
    if (!selected) return;
    setVerificationStatus(selected.id, status, decisionNote || undefined);
    setDecisionNote("");
    setSelectedId(null);
  }

  return (
    <div className="flex flex-col gap-4 pb-12">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Verification queue</h1>
        <p className="text-sm text-muted-foreground">Review and decide on submitted changemaker profiles.</p>
      </div>

      <div className="flex gap-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setSelectedId(null);
            }}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ${
              tab === t.key ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
            }`}
          >
            {t.label}
            <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground">{t.count}</span>
          </button>
        ))}
      </div>

      {queue.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="Nothing here" description="No profiles currently match this tab." />
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
          <div className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
            {queue.map((person) => (
              <button
                key={person.id}
                onClick={() => setSelectedId(person.id)}
                className={`flex flex-col items-start gap-1 px-3 py-2.5 text-left ${
                  selected?.id === person.id ? "bg-accent" : "hover:bg-accent/50"
                }`}
              >
                <span className="text-sm font-medium text-foreground">{person.name}</span>
                <span className="text-xs text-muted-foreground">
                  {person.city}, {person.country} · {person.organization}
                </span>
                {person.admin.priority === "high" && (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-destructive">High priority</span>
                )}
              </button>
            ))}
          </div>

          {selected && (
            <div className="rounded-lg border border-border p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{selected.category}</p>
                  <h2 className="mt-1 text-xl font-semibold text-foreground">{selected.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {selected.city}, {selected.country} · {selected.organization}
                  </p>
                </div>
                <VerificationBadge status={selected.admin.verificationStatus} />
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{selected.bio}</p>

              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground">SDGs referenced</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.sdgs.map((num) => (
                    <SdgIcon key={num} number={num} size={22} />
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-md bg-secondary/40 p-3 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">Profile completeness: {selected.admin.profileCompleteness}%</p>
                <p className="mt-1">
                  {selected.admin.profileCompleteness < 70
                    ? "Several fields look thin — consider requesting changes before approving."
                    : "Profile looks reasonably complete."}
                </p>
              </div>

              <textarea
                value={decisionNote}
                onChange={(event) => setDecisionNote(event.target.value)}
                placeholder="Optional note for this decision"
                rows={2}
                className="mt-4 w-full rounded-md border border-input bg-secondary/40 p-2.5 text-sm text-foreground outline-none"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => decide("verified")}
                  className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  onClick={() => decide("needs_changes")}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Request changes
                </button>
                <button
                  onClick={() => decide("rejected")}
                  className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
                <button
                  disabled
                  title="Reports & Flags module isn't built yet"
                  className="flex cursor-not-allowed items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground/50"
                >
                  <Flag className="h-3.5 w-3.5" /> Flag
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
