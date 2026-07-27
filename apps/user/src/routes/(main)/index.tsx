import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCookie } from "@workspace/ui/lib/cookies";

// Redirecting before load (instead of in a post-paint effect) avoids flashing
// the landing page at logged-in users. The Authorization cookie is the same
// signal `__root` uses to hydrate the user.
export const Route = createFileRoute("/(main)/")({
  beforeLoad: () => {
    if (getCookie("Authorization")) {
      throw redirect({ to: "/dashboard" });
    }
    if (import.meta.env.VITE_SHOW_LANDING_PAGE === "false") {
      throw redirect({ to: "/auth" });
    }
  },
});
