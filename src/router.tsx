import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    // The default is 1000ms, which means a navigation that takes 200ms still
    // shows the outgoing page for a full second with no feedback. A route whose
    // work finishes before this elapses never shows its `pendingComponent` at
    // all, so these values only apply to the genuinely slow case — and then they
    // swap in the fallback almost immediately instead of after a visible stall.
    defaultPendingMs: 120,
    defaultPendingMinMs: 0,
  });

  return router;
};
