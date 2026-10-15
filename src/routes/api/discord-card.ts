import { createFileRoute } from "@tanstack/react-router";

const CARD_URL =
  "https://dsc-readme.tsuni.dev/api/user/275774468658298883?aboutMe=audentes+fortuna+iuvat&theme=custom&colorB1=000000&colorB2=313338&colorB3=505059&colorT1=ffffff&colorT2=d2d6d8&width=315&font=vampyre&nameColor1=230536";

export const Route = createFileRoute("/api/discord-card")({
  server: {
    handlers: {
      GET: async () => {
        const upstream = await fetch(`${CARD_URL}&cb=${Math.floor(Date.now() / 60000)}`);

        if (!upstream.ok) {
          return new Response(`Upstream returned ${upstream.status}`, {
            status: 502,
            headers: { "Cache-Control": "no-store" },
          });
        }

        return new Response(await upstream.text(), {
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          },
        });
      },
    },
  },
});
