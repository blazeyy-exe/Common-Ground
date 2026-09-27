import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import { createAdminChangemakers } from "../data/adminMeta";
import { createInitialActivity } from "../data/activityLog";
import { currentAdmin } from "../data/session";
import type {
  ActivityEvent,
  AdminChangemaker,
  ProfileStatus,
  VerificationStatus,
} from "../types/admin";

type AdminDataValue = {
  people: AdminChangemaker[];
  activity: ActivityEvent[];
  getPerson: (id: string) => AdminChangemaker | undefined;
  setVerificationStatus: (
    id: string,
    status: VerificationStatus,
    note?: string,
  ) => void;
  setProfileStatus: (id: string, status: ProfileStatus) => void;
  addNote: (id: string, text: string) => void;
};

const AdminDataContext = createContext<AdminDataValue | null>(null);

export function AdminDataProvider({ children }: { children: React.ReactNode }) {
  const [people, setPeople] = useState<AdminChangemaker[]>(() => createAdminChangemakers());
  const [activity, setActivity] = useState<ActivityEvent[]>(() => createInitialActivity(people));

  const logEvent = useCallback((event: ActivityEvent) => {
    setActivity((current) => [event, ...current]);
  }, []);

  const setVerificationStatus = useCallback(
    (id: string, status: VerificationStatus, note?: string) => {
      const at = new Date().toISOString();
      let label = id;

      setPeople((current) =>
        current.map((person) => {
          if (person.id !== id) return person;
          label = person.name;

          return {
            ...person,
            admin: {
              ...person.admin,
              verificationStatus: status,
              updatedAt: at,
              verificationHistory: [
                ...person.admin.verificationHistory,
                {
                  id: `${id}-${at}`,
                  status,
                  at,
                  admin: currentAdmin.name,
                  // Spread, not `note: undefined` — `exactOptionalPropertyTypes`
                  // rejects an explicit undefined on an optional property.
                  ...(note ? { note } : {}),
                },
              ],
            },
          };
        }),
      );

      logEvent({
        id: `${id}-verification-${Date.now()}`,
        at,
        admin: currentAdmin.name,
        action:
          status === "verified"
            ? "verified_profile"
            : status === "needs_changes"
              ? "requested_changes"
              : status === "rejected"
                ? "rejected_profile"
                : "changed_status",
        entityType: "changemaker",
        entityId: id,
        entityLabel: label,
        summary: `${currentAdmin.name} set ${label}'s verification to ${status.replace("_", " ")}.`,
      });
    },
    [logEvent],
  );

  const setProfileStatus = useCallback(
    (id: string, status: ProfileStatus) => {
      const at = new Date().toISOString();
      let label = id;

      setPeople((current) =>
        current.map((person) => {
          if (person.id !== id) return person;
          label = person.name;

          return {
            ...person,
            admin: { ...person.admin, profileStatus: status, updatedAt: at },
          };
        }),
      );

      logEvent({
        id: `${id}-status-${Date.now()}`,
        at,
        admin: currentAdmin.name,
        action: "changed_status",
        entityType: "changemaker",
        entityId: id,
        entityLabel: label,
        summary: `${currentAdmin.name} set ${label}'s status to ${status}.`,
      });
    },
    [logEvent],
  );

  const addNote = useCallback(
    (id: string, text: string) => {
      const at = new Date().toISOString();
      let label = id;

      setPeople((current) =>
        current.map((person) => {
          if (person.id !== id) return person;
          label = person.name;

          return {
            ...person,
            admin: {
              ...person.admin,
              adminNotes: [
                ...person.admin.adminNotes,
                { id: `${id}-note-${Date.now()}`, at, admin: currentAdmin.name, text },
              ],
            },
          };
        }),
      );

      logEvent({
        id: `${id}-note-${Date.now()}`,
        at,
        admin: currentAdmin.name,
        action: "added_note",
        entityType: "changemaker",
        entityId: id,
        entityLabel: label,
        summary: `${currentAdmin.name} added a note to ${label}.`,
      });
    },
    [logEvent],
  );

  const getPerson = useCallback(
    (id: string) => people.find((person) => person.id === id),
    [people],
  );

  const value = useMemo<AdminDataValue>(
    () => ({ people, activity, getPerson, setVerificationStatus, setProfileStatus, addNote }),
    [people, activity, getPerson, setVerificationStatus, setProfileStatus, addNote],
  );

  return <AdminDataContext.Provider value={value}>{children}</AdminDataContext.Provider>;
}

export function useAdminData(): AdminDataValue {
  const context = useContext(AdminDataContext);
  if (!context) {
    throw new Error("useAdminData must be used within an AdminDataProvider");
  }
  return context;
}
