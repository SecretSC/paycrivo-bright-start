import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/swap")({
  beforeLoad: () => {
    throw redirect({ to: "/exchange" });
  },
});
