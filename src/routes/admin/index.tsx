import { createFileRoute } from "@tanstack/react-router";

import { OverviewPage } from "@/admin/pages/OverviewPage";

export const Route = createFileRoute("/admin/")({
  component: OverviewPage,
});
