import { createFileRoute } from "@tanstack/react-router";
import { checkLicense } from "@/lib/tool667.server";

export const Route = createFileRoute("/api/667tool-license")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        const payload = (await request.json().catch(() => null)) as { key?: unknown } | null;
        const key = String(payload?.key ?? "").trim();
        if (!key) {
          return Response.json(
            { valid: false, revoked: false },
            { headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
        const ip =
          request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for");
        try {
          const res = await checkLicense(key, ip);
          return Response.json(res, { headers: { "Access-Control-Allow-Origin": "*" } });
        } catch {
          return Response.json(
            { valid: false, revoked: false },
            { headers: { "Access-Control-Allow-Origin": "*" } },
          );
        }
      },
    },
  },
});
