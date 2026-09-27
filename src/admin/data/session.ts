import type { AdminUser } from "../types/admin";

/**
 * Placeholder admin identity. There is no auth backend yet — this is the
 * single place that stands in for "the currently signed-in admin" until
 * real authentication is wired up. Swap this for session data, not a
 * scattered constant, when that happens.
 */
export const currentAdmin: AdminUser = {
  id: "admin-baibhav",
  name: "Baibhav",
  role: "Super Admin",
  initials: "B",
};
