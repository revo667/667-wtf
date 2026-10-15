import { createFileRoute } from "@tanstack/react-router";
import { fetchLatestRelease, pickAsset } from "@/lib/github-release";

const RELEASE_REPO = "revo667/667-tool-releases";

function semver(...candidates: Array<string | undefined>): string | null {
  for (const c of candidates) {
    const m = c?.match(/(\d+\.\d+\.\d+)/);
    if (m?.[1]) return m[1];
  }
  return null;
}

export const Route = createFileRoute("/api/667tool-update")({
  server: {
    handlers: {
      GET: async () => {
        const headers = {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
          "Access-Control-Allow-Origin": "*",
        };
        try {
          const release = await fetchLatestRelease(RELEASE_REPO);
          if (!release) {
            return new Response(JSON.stringify({ latest: null }), { headers });
          }
          const mac = pickAsset(release.assets, "mac");
          const win = pickAsset(release.assets, "windows");
          const assets: { mac?: string; windows?: string } = {};
          if (mac) assets.mac = mac.url;
          if (win) assets.windows = win.url;
          const manifest = {
            latest:
              semver(mac?.name, win?.name, release.version) ?? release.version.replace(/^v/i, ""),
            notes: null,
            assets,
            names: { mac: mac?.name ?? null, windows: win?.name ?? null },
            published_at: release.publishedAt,
            page: release.pageUrl,
          };
          return new Response(JSON.stringify(manifest), { headers });
        } catch (err) {
          return new Response(JSON.stringify({ latest: null, error: String(err) }), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
          });
        }
      },
    },
  },
});
