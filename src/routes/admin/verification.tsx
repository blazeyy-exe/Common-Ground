import { createFileRoute } from "@tanstack/react-router";

import { VerificationPage } from "@/admin/pages/VerificationPage";

export const Route = createFileRoute("/admin/verification")({
  component: VerificationPage,
});
