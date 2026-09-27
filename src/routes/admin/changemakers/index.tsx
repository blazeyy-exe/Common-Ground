import { createFileRoute } from "@tanstack/react-router";

import { ChangemakersPage } from "@/admin/pages/ChangemakersPage";

export const Route = createFileRoute("/admin/changemakers/")({
  component: ChangemakersPage,
});
