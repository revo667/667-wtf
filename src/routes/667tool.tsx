import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/667tool")({
  component: () => <Outlet />,
});
