import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/universe/login")({
  beforeLoad: () => {
    throw redirect({ href: "/api/universe/login?next=%2Funiverse" });
  },
});
