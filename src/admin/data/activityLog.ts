import { connections } from "@/data/connections";
import type { ActivityEvent, AdminChangemaker } from "../types/admin";

function actionForStatus(status: string): ActivityEvent["action"] {
  switch (status) {
    case "verified":
      return "verified_profile";
    case "needs_changes":
      return "requested_changes";
    case "rejected":
      return "rejected_profile";
    default:
      return "profile_joined";
  }
}

function summaryForStatus(name: string, status: string): string {
  switch (status) {
    case "verified":
      return `${name}'s profile was verified.`;
    case "needs_changes":
      return `Changes were requested on ${name}'s profile.`;
    case "rejected":
      return `${name}'s verification was rejected.`;
    default:
      return `${name} joined the network.`;
  }
}

export function createInitialActivity(people: AdminChangemaker[]): ActivityEvent[] {
  const fromVerification: ActivityEvent[] = people.flatMap((person) =>
    person.admin.verificationHistory.map((event) => ({
      id: event.id,
      at: event.at,
      admin: event.admin,
      action: actionForStatus(event.status),
      entityType: "changemaker" as const,
      entityId: person.id,
      entityLabel: person.name,
      summary: summaryForStatus(person.name, event.status),
    })),
  );

  const byId = new Map(people.map((person) => [person.id, person]));

  const fromConnections: ActivityEvent[] = connections
    .filter((connection) => byId.has(connection.sourceId) && byId.has(connection.targetId))
    .slice(0, 12)
    .map((connection, index) => {
      const source = byId.get(connection.sourceId)!;
      const target = byId.get(connection.targetId)!;
      const at = new Date(Date.now() - (index + 1) * 36 * 60 * 60 * 1000).toISOString();

      return {
        id: `${connection.id}-logged`,
        at,
        admin: "System",
        action: "profile_updated" as const,
        entityType: "changemaker" as const,
        entityId: source.id,
        entityLabel: `${source.name} \u2194 ${target.name}`,
        summary: `${connection.type} connection recorded between ${source.name} and ${target.name}.`,
      };
    });

  return [...fromVerification, ...fromConnections].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}
