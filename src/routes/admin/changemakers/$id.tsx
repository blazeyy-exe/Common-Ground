import { createFileRoute } from "@tanstack/react-router";

import { ChangemakerDetailPage } from "@/admin/pages/ChangemakerDetailPage";

export const Route = createFileRoute("/admin/changemakers/$id")({
  component: RouteComponent,
});

function RouteComponent() {
  const { id } = Route.useParams();
  return <ChangemakerDetailPage id={id} />;
}
