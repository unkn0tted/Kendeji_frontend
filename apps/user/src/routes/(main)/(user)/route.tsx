import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCookie } from "@workspace/ui/lib/cookies";

// Anonymous visitors should never see the dashboard shell; without this guard
// the group rendered the full layout for guests until an API call hit a 401.
export const Route = createFileRoute("/(main)/(user)")({
  beforeLoad: () => {
    if (!getCookie("Authorization")) {
      throw redirect({ to: "/auth" });
    }
  },
});
