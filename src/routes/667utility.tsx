import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  detectPlatform,
  fetchLatestRelease,
  formatSize,
  pickAsset,
  type LatestRelease,
  type Platform,
} from "@/lib/github-release";

const REPO = "revo667/667-utility";
const LANG_KEY = "utilityLang";

type Lang = "tr" | "en";

const PLATFORM_LABEL: Record<Platform, string> = {
  mac: "macOS",
  windows: "Windows",
  linux: "Linux",
};

const COPY = {
  tr: {
    back: "ANA SAYFA",
    tagline: "Açık kaynak masaüstü yardımcı programı",
    description: [
      "667 Utility, günlük işleri tek bir yerde toplayan hafif bir masaüstü uygulaması.",
      "Kurulumdan sonra arka planda çalışır, sistem kaynaklarını meşgul etmez ve hiçbir veriyi dışarı göndermez.",
    ],
    platforms: "PLATFORMLAR",
    openSource: "Tamamen açık kaynak",
    free: "Ücretsiz",
    noTelemetry: "Veri toplamaz",
    download: "İNDİR",
    downloadFor: (p: string) => `${p} İÇİN İNDİR`,
    otherPlatforms: "Diğer platformlar",
    viewSource: "Kaynak kodu görüntüle",
    loading: "Son sürüm alınıyor...",
    allReleases: "Tüm sürümler",
    noAsset: "Bu platform için hazır dosya yok",
    version: "Sürüm",
  },
  en: {
    back: "HOME",
    tagline: "Open source desktop utility",
    description: [
      "667 Utility is a lightweight desktop app that brings everyday tasks together in one place.",
      "It runs quietly in the background, stays out of your system's way, and sends nothing anywhere.",
    ],
    platforms: "PLATFORMS",
    openSource: "Fully open source",
    free: "Free",
    noTelemetry: "No telemetry",
    download: "DOWNLOAD",
    downloadFor: (p: string) => `DOWNLOAD FOR ${p.toUpperCase()}`,
    otherPlatforms: "Other platforms",
    viewSource: "View source",
    loading: "Fetching latest release...",
    allReleases: "All releases",
    noAsset: "No build available for this platform",
    version: "Version",
  },
} as const;

function Utility() {
  const [lang, setLang] = useState<Lang>("en");
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [release, setRelease] = useState<LatestRelease | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  const t = COPY[lang];

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "tr" || saved === "en") setLang(saved);
    else if (navigator.language?.toLowerCase().startsWith("tr")) setLang("tr");

    const hint =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ?? navigator.platform;
    setPlatform(detectPlatform(navigator.userAgent, hint));
  }, []);

  useEffect(() => {
    let alive = true;
    fetchLatestRelease(REPO)
      .then((r) => {
        if (!alive) return;
        setRelease(r);
        setState(r ? "ready" : "error");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, []);

  const pickLang = (next: Lang) => {
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
  };

  const primary = useMemo(
    () => (release && platform ? pickAsset(release.assets, platform) : null),
    [release, platform],
  );

  const others = useMemo(() => {
    if (!release) return [];
    return (["mac", "windows", "linux"] as Platform[])
      .filter((p) => p !== platform)
      .map((p) => ({ platform: p, asset: pickAsset(release.assets, p) }))
      .filter((x) => x.asset);
  }, [release, platform]);

  const releasesUrl = release?.pageUrl ?? `https://github.com/${REPO}/releases`;

  return (
    <div className="min-h-screen bg-neutral-950 text-white/80 selection:bg-violet-500/30">
      <div className="pointer-events-none fixed inset-0 opacity-[0.35] [background:radial-gradient(circle_at_50%_-10%,rgba(139,92,246,0.18),transparent_60%)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
        <Link
          to="/"
          className="group flex items-center gap-2 font-mono text-[10px] tracking-widest text-white/40 transition-colors duration-300 hover:text-white"
        >
          <span
            aria-hidden
            className="transition-transform duration-300 group-hover:-translate-x-0.5"
          >
            ←
          </span>
          <span>{t.back}</span>
        </Link>

        <div className="flex items-center gap-1 font-mono text-[10px] tracking-widest">
          {(["tr", "en"] as Lang[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => pickLang(code)}
              className={`px-2 py-1 transition-colors duration-300 ${
                lang === code ? "text-white" : "text-white/30 hover:text-white/60"
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-24 sm:px-10">
        <section className="animate-in-up pt-10 sm:pt-16">
          <div className="flex items-center gap-3">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_2px_rgba(139,92,246,0.7)]" />
            <span className="font-mono text-[10px] tracking-widest text-white/40">
              {t.tagline.toUpperCase()}
            </span>
          </div>

          <h1 className="mt-5 text-5xl leading-none font-semibold tracking-tight text-white sm:text-7xl">
            667 Utility
          </h1>

          <div className="mt-8 space-y-4 text-sm leading-relaxed text-white/60 sm:text-base">
            {t.description.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-2">
            {[t.openSource, t.free, t.noTelemetry].map((badge) => (
              <span
                key={badge}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 font-mono text-[10px] tracking-widest text-white/50"
              >
                {badge.toUpperCase()}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-14 border-t border-white/8 pt-10">
          <h2 className="font-mono text-[10px] tracking-widest text-white/30">{t.platforms}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(["mac", "windows", "linux"] as Platform[]).map((p) => (
              <div
                key={p}
                className={`rounded-sm border px-4 py-3 transition-colors duration-300 ${
                  p === platform
                    ? "border-violet-500/40 bg-violet-500/[0.07] text-white"
                    : "border-white/10 bg-white/[0.02] text-white/50"
                }`}
              >
                <div className="font-mono text-xs tracking-widest">{PLATFORM_LABEL[p]}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          {state === "loading" && (
            <p className="font-mono text-[10px] tracking-widest text-white/30">
              {t.loading.toUpperCase()}
            </p>
          )}

          {state === "error" && (
            <a
              href={releasesUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-sm border border-white/15 px-6 py-4 font-mono text-xs tracking-widest text-white/70 transition-colors duration-300 hover:border-white/40 hover:text-white"
            >
              {t.download} <span aria-hidden>↗</span>
            </a>
          )}

          {state === "ready" && release && (
            <>
              {primary ? (
                <a
                  href={primary.url}
                  className="group inline-flex items-center gap-3 rounded-sm border border-violet-500/50 bg-violet-500/15 px-7 py-4 font-mono text-xs tracking-widest text-violet-200 transition-all duration-300 hover:bg-violet-500/25 hover:text-white"
                >
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-y-0.5"
                  >
                    ↓
                  </span>
                  <span>{t.downloadFor(PLATFORM_LABEL[platform as Platform])}</span>
                </a>
              ) : (
                <a
                  href={releasesUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-2 rounded-sm border border-white/15 px-6 py-4 font-mono text-xs tracking-widest text-white/70 transition-colors duration-300 hover:border-white/40 hover:text-white"
                >
                  {platform ? t.noAsset : t.download} <span aria-hidden>↗</span>
                </a>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] tracking-widest text-white/30">
                {release.version && (
                  <span>
                    {t.version.toUpperCase()} {release.version}
                  </span>
                )}
                {primary && formatSize(primary.size) && <span>{formatSize(primary.size)}</span>}
                <a
                  href={releasesUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="transition-colors duration-300 hover:text-white/70"
                >
                  {t.allReleases.toUpperCase()} ↗
                </a>
              </div>

              {others.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-mono text-[10px] tracking-widest text-white/30">
                    {t.otherPlatforms.toUpperCase()}
                  </h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {others.map(({ platform: p, asset }) => (
                      <a
                        key={p}
                        href={asset!.url}
                        className="rounded-sm border border-white/10 px-4 py-2 font-mono text-[10px] tracking-widest text-white/50 transition-colors duration-300 hover:border-white/30 hover:text-white"
                      >
                        {PLATFORM_LABEL[p].toUpperCase()}
                        {formatSize(asset!.size) && (
                          <span className="text-white/25"> · {formatSize(asset!.size)}</span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="mt-14 border-t border-white/8 pt-8">
          <a
            href={`https://github.com/${REPO}`}
            target="_blank"
            rel="noreferrer noopener"
            className="group inline-flex items-center gap-2 font-mono text-[10px] tracking-widest text-white/40 transition-colors duration-300 hover:text-white"
          >
            <span className="h-1 w-1 rounded-full bg-white/20 transition-all duration-300 group-hover:bg-violet-500" />
            {t.viewSource.toUpperCase()}
            <span
              aria-hidden
              className="opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-100"
            >
              ↗
            </span>
          </a>
        </section>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/667utility")({
  component: Utility,
  head: () => ({
    meta: [
      { title: "667 Utility — revo667" },
      {
        name: "description",
        content: "667 Utility — free and open source desktop utility for macOS, Windows and Linux.",
      },
    ],
  }),
});
