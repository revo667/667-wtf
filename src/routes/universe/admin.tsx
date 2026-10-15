import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/universe/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
  component: () => null,
});
