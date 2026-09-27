import type { Changemaker } from "@/data/changemakers";

export type VerificationStatus =
  | "verified"
  | "pending"
  | "needs_changes"
  | "rejected";

export type ProfileStatus = "active" | "draft" | "suspended" | "archived";

export type VerificationEvent = {
  id: string;
  status: VerificationStatus;
  at: string; // ISO date
  admin: string;
  note?: string;
};

export type AdminNote = {
  id: string;
  at: string;
  admin: string;
  text: string;
};

export type AdminChangemakerMeta = {
  verificationStatus: VerificationStatus;
  profileStatus: ProfileStatus;
  joinedAt: string;
  updatedAt: string;
  assignedReviewer: string | null;
  profileCompleteness: number; // 0-100
  priority: "low" | "normal" | "high";
  adminNotes: AdminNote[];
  verificationHistory: VerificationEvent[];
};

/**
 * A real Changemaker record plus the operational metadata the public
 * dataset has no reason to carry. This is the shape every admin page reads.
 */
export type AdminChangemaker = Changemaker & {
  admin: AdminChangemakerMeta;
};

export type ActivityAction =
  | "verified_profile"
  | "requested_changes"
  | "rejected_profile"
  | "flagged_profile"
  | "changed_status"
  | "added_note"
  | "profile_updated"
  | "profile_joined";

export type ActivityEvent = {
  id: string;
  at: string;
  admin: string;
  action: ActivityAction;
  entityType: "changemaker";
  entityId: string;
  entityLabel: string;
  summary: string;
};

export type AdminRole =
  | "Super Admin"
  | "Admin"
  | "Moderator"
  | "Reviewer"
  | "Analyst";

export type AdminUser = {
  id: string;
  name: string;
  role: AdminRole;
  initials: string;
};
