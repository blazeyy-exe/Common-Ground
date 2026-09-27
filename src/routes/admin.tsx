import { createFileRoute, Outlet } from "@tanstack/react-router";

import { AdminLayout } from "@/admin/components/AdminLayout";
import { AdminDataProvider } from "@/admin/state/AdminDataContext";

export const Route = createFileRoute("/admin")({
  component: AdminRouteLayout,
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
