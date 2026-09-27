import { changemakers, type Changemaker } from "@/data/changemakers";
import type {
  AdminChangemaker,
  AdminChangemakerMeta,
  ProfileStatus,
  VerificationStatus,
} from "../types/admin";

/**
 * The real dataset has no verification/status/reviewer fields — it was
 * never meant to. Everything below derives believable, *stable* admin
 * metadata per person, seeded only by their id, so re-rendering or
 * reloading never reshuffles anyone's state. This is the one place that
 * invents numbers; every admin page reads through here rather than
 * rolling its own fake data.
 */

function hashString(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const REVIEWERS = [
  "Priya Nair",
  "Jonas Weber",
  "Fatima Haidari",
  "Diego Alarcon",
  "Wei Lin",
];

/** `noUncheckedIndexedAccess` makes a bare index `string | undefined`; a fixed,
 *  non-empty roster means any draw is a real name, so fall back defensively
 *  rather than letting an `undefined` reviewer reach the type. */
function pickReviewer(rng: () => number): string {
  return REVIEWERS[Math.floor(rng() * REVIEWERS.length)] ?? REVIEWERS[0]!;
}

const VERIFICATION_WEIGHTS: [VerificationStatus, number][] = [
  ["verified", 0.72],
  ["pending", 0.16],
  ["needs_changes", 0.08],
  ["rejected", 0.04],
];

function pickWeighted<T>(rng: () => number, weights: [T, number][]): T {
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rng() * total;
  for (const [value, weight] of weights) {
    roll -= weight;
    if (roll <= 0) return value;
  }
  const last = weights[weights.length - 1];
  if (!last) throw new Error("pickWeighted requires at least one weighted value");
  return last[0];
}

function daysAgoIso(rng: () => number, minDays: number, maxDays: number): string {
  const days = minDays + rng() * (maxDays - minDays);
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

function buildMeta(person: Changemaker): AdminChangemakerMeta {
  const rng = mulberry32(hashString(person.id));

  const verificationStatus = pickWeighted(rng, VERIFICATION_WEIGHTS);

  const profileStatus: ProfileStatus =
    verificationStatus === "rejected" && rng() < 0.4
      ? "suspended"
      : rng() < 0.03
        ? "archived"
        : rng() < 0.05
          ? "draft"
          : "active";

  const joinedAt = daysAgoIso(rng, 14, 540);
  const updatedAt = daysAgoIso(rng, 0, 45);

  const needsReviewer =
    verificationStatus === "pending" || verificationStatus === "needs_changes";

  const assignedReviewer = needsReviewer ? pickReviewer(rng) : null;

  const completenessBase = verificationStatus === "verified" ? 82 : 55;
  const profileCompleteness = Math.min(100, Math.round(completenessBase + rng() * 20));

  const priority: AdminChangemakerMeta["priority"] =
    verificationStatus === "needs_changes"
      ? "high"
      : verificationStatus === "pending" && rng() < 0.25
        ? "high"
        : "normal";

  const history: AdminChangemakerMeta["verificationHistory"] = [
    { id: `${person.id}-submitted`, status: "pending", at: joinedAt, admin: "System" },
  ];

  if (verificationStatus !== "pending") {
    // Built by spread rather than `note: undefined`: with
    // `exactOptionalPropertyTypes` an explicit undefined is not assignable to
    // the optional `note`, and an absent key is the correct shape anyway.
    const note =
      verificationStatus === "needs_changes"
        ? "Missing organization reference."
        : verificationStatus === "rejected"
          ? "Could not confirm identity from supplied links."
          : undefined;

    history.push({
      id: `${person.id}-decision`,
      status: verificationStatus,
      at: updatedAt,
      admin: assignedReviewer ?? pickReviewer(rng),
      ...(note ? { note } : {}),
    });
  }

  return {
    verificationStatus,
    profileStatus,
    joinedAt,
    updatedAt,
    assignedReviewer,
    profileCompleteness,
    priority,
    adminNotes: [],
    verificationHistory: history,
  };
}

export function createAdminChangemakers(): AdminChangemaker[] {
  return changemakers.map((person) => ({
    ...person,
    admin: buildMeta(person),
  }));
}
