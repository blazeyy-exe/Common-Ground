import { Link } from "@tanstack/react-router";
import { Archive, ArrowLeft, Ban, RotateCcw, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

import type { Connection } from "@/data/connections";
import { connections } from "@/data/connections";
import { sdgs } from "@/data/sdgs";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { SdgIcon } from "@/components/SdgIcon";
import { ProfileStatusBadge, VerificationBadge } from "../components/StatusBadge";
import { formatDateTime, formatDay } from "../lib/format";
import { useAdminData } from "../state/AdminDataContext";
import type { AdminChangemaker } from "../types/admin";

export function ChangemakerDetailPage({ id }: { id: string }) {
  const { people, getPerson, setVerificationStatus, setProfileStatus, addNote } = useAdminData();
  const person = getPerson(id);

  const [note, setNote] = useState("");
  const [confirmSuspend, setConfirmSuspend] = useState(false);

  const relatedConnections = useMemo(() => {
    if (!person) return [] as { connection: Connection; other: AdminChangemaker }[];

    const result: { connection: Connection; other: AdminChangemaker }[] = [];
    for (const connection of connections) {
      if (connection.sourceId !== person.id && connection.targetId !== person.id) continue;
      const otherId = connection.sourceId === person.id ? connection.targetId : connection.sourceId;
      const other = people.find((candidate) => candidate.id === otherId);
      if (other) result.push({ connection, other });
    }
    return result;
  }, [person, people]);

  if (!person) {
    return (
      <div className="flex flex-col gap-3">
        <Link to="/admin/changemakers" className="flex w-fit items-center gap-1 text-sm text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to changemakers
        </Link>
        <p className="text-sm text-muted-foreground">This profile could not be found.</p>
      </div>
    );
  }

  const personSdgs = sdgs.filter((sdg) => person.sdgs.includes(sdg.number));

  return (
    <div className="flex flex-col gap-4 pb-12">
      <Link to="/admin/changemakers" className="flex w-fit items-center gap-1 text-sm text-primary">
        <ArrowLeft className="h-4 w-4" /> Back to changemakers
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-primary bg-secondary text-lg font-semibold text-primary">
                {person.name
                  .split(" ")
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">{person.category}</p>
                <h1 className="mt-1 text-2xl font-semibold text-foreground">{person.name}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  {person.city}, {person.country} · {person.organization}
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">{person.bio}</p>

            <div className="mt-5">
              <p className="text-xs font-semibold text-muted-foreground">Focus areas</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {person.focusAreas.map((area) => (
                  <span key={area} className="rounded-full border border-border bg-secondary/40 px-2.5 py-1 text-xs text-foreground">
                    {area}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs font-semibold text-muted-foreground">SDGs</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {personSdgs.map((sdg) => (
                  <span
                    key={sdg.number}
                    className="inline-flex items-center gap-2 overflow-hidden rounded border border-border py-1 pl-1 pr-2.5 text-xs"
                  >
                    <SdgIcon number={sdg.number} size={22} />
                    <span className="text-foreground">{sdg.name}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground">Network</h2>
            {relatedConnections.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No connections recorded for this profile.</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {relatedConnections.map(({ connection, other }) => (
                  <Link
                    key={connection.id}
                    to="/admin/changemakers/$id"
                    params={{ id: other.id }}
                    className="flex items-center justify-between rounded-md border border-border px-3 py-2 hover:bg-accent"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{other.name}</p>
                      <p className="text-xs text-muted-foreground">{connection.type}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{other.country}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border p-5">
            <h2 className="text-sm font-semibold text-foreground">
              Admin notes <span className="text-muted-foreground">({person.admin.adminNotes.length})</span>
            </h2>

            <div className="mt-3 flex flex-col gap-2">
              {person.admin.adminNotes.map((entry) => (
                <div key={entry.id} className="rounded-md bg-secondary/40 px-3 py-2 text-xs">
                  <p className="text-foreground">{entry.text}</p>
                  <p className="mt-1 text-muted-foreground">
                    {entry.admin} · {formatDateTime(entry.at)}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add an internal note"
                className="h-9 flex-1 rounded-md border border-input bg-secondary/40 px-2.5 text-sm text-foreground outline-none"
              />
              <button
                onClick={() => {
                  if (!note.trim()) return;
                  addNote(person.id, note.trim());
                  setNote("");
                }}
                className="rounded-md border border-border px-3 text-sm text-foreground hover:bg-accent"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground">Verification</p>
            <div className="mt-2">
              <VerificationBadge status={person.admin.verificationStatus} />
            </div>

            <p className="mt-4 text-xs font-semibold text-muted-foreground">Profile status</p>
            <div className="mt-2">
              <ProfileStatusBadge status={person.admin.profileStatus} />
            </div>

            <p className="mt-4 text-xs font-semibold text-muted-foreground">Profile completeness</p>
            <div className="mt-2 h-1.5 rounded-full bg-muted">
              <div className="h-1.5 rounded-full bg-primary" style={{ width: `${person.admin.profileCompleteness}%` }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{person.admin.profileCompleteness}%</p>

            <div className="mt-4 flex flex-col gap-1 text-xs text-muted-foreground">
              <p>Joined {formatDay(person.admin.joinedAt)}</p>
              <p>Updated {formatDay(person.admin.updatedAt)}</p>
              {person.admin.assignedReviewer && <p>Reviewer: {person.admin.assignedReviewer}</p>}
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => setVerificationStatus(person.id, "verified")}
                className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
              >
                <ShieldCheck className="h-3.5 w-3.5" /> Verify
              </button>
              <button
                onClick={() =>
                  setVerificationStatus(person.id, "needs_changes", "Requested more detail from admin dashboard.")
                }
                className="flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Request changes
              </button>
              <button
                onClick={() => setConfirmSuspend(true)}
                className="flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
              >
                <Ban className="h-3.5 w-3.5" /> Suspend
              </button>
              <button
                onClick={() => setProfileStatus(person.id, "archived")}
                className="flex items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
              >
                <Archive className="h-3.5 w-3.5" /> Archive
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="text-xs font-semibold text-muted-foreground">Verification history</p>
            <div className="mt-3 flex flex-col gap-3">
              {person.admin.verificationHistory.map((event) => (
                <div key={event.id} className="border-l-2 border-border pl-3 text-xs">
                  <p className="font-medium capitalize text-foreground">{event.status.replace("_", " ")}</p>
                  <p className="text-muted-foreground">
                    {event.admin} · {formatDay(event.at)}
                  </p>
                  {event.note && <p className="mt-1 text-muted-foreground">{event.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSuspend}
        title="Suspend this profile?"
        description={`${person.name}'s profile will be hidden from the public network until reinstated.`}
        confirmLabel="Suspend"
        destructive
        onConfirm={() => {
          setProfileStatus(person.id, "suspended");
          setConfirmSuspend(false);
        }}
        onCancel={() => setConfirmSuspend(false)}
      />
    </div>
  );
}
