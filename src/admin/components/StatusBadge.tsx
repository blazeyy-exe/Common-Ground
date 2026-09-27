import { Check, Clock, RotateCcw, X } from "lucide-react";
import type { ComponentType } from "react";
import type { ProfileStatus, VerificationStatus } from "../types/admin";

const VERIFICATION_CONFIG: Record<
  VerificationStatus,
  { label: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  verified: {
    label: "Verified",
    icon: Check,
    className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  },
  pending: {
    label: "Pending",
    icon: Clock,
    className: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  },
  needs_changes: {
    label: "Needs changes",
    icon: RotateCcw,
    className: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  },
  rejected: {
    label: "Rejected",
    icon: X,
    className: "text-destructive bg-destructive/10 border-destructive/30",
  },
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  const config = VERIFICATION_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.className}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

const STATUS_CONFIG: Record<ProfileStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30" },
  draft: { label: "Draft", className: "text-muted-foreground bg-muted border-border" },
  suspended: { label: "Suspended", className: "text-amber-400 bg-amber-400/10 border-amber-400/30" },
  archived: { label: "Archived", className: "text-muted-foreground bg-muted border-border" },
};

export function ProfileStatusBadge({ status }: { status: ProfileStatus }) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
