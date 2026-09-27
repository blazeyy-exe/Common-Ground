import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AdminLayout } from "@/admin/components/AdminLayout";
import { AdminPending } from "@/admin/components/AdminPending";
import { AdminDataProvider } from "@/admin/state/AdminDataContext";

export const Route = createFileRoute("/admin")({
  component: AdminRouteLayout,
  // Rendered in place of the whole admin shell while this match is pending.
  // It must stay self-contained: the `AdminDataProvider` below lives inside
  // `AdminRouteLayout`, which this fallback replaces, so it must not read that
  // context (or any other route data).
  pendingComponent: AdminPending,
});

function AdminRouteLayout() {
  return (
    <AdminDataProvider>
      <AdminLayout>
        <Outlet />
      </AdminLayout>
    </AdminDataProvider>
  );
}
