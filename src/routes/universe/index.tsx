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
import { logout, me, signInUrl, type Account } from "@/lib/account";

const REPO = "revo667/universe";
const LANG_KEY = "universeLang";
const RELEASE_KEY = "universeRelease";
const RELEASE_TTL = 30 * 60 * 1000;

type Lang = "tr" | "en";

const PLATFORMS: Platform[] = ["mac", "windows", "linux"];

const PLATFORM_LABEL: Record<Platform, string> = {
  mac: "macOS",
  windows: "Windows",
  linux: "Linux",
};

const COPY = {
  tr: {
    back: "ANA SAYFA",
    tagline: "Açık kaynak masaüstü evreni",
    description: [
      "Universe, gün içinde dağılan işleri tek bir masaüstünde toplar: müzik, sohbet, dosyalar, notlar, terminal ve yapay zekâ aynı ekranda.",
      "Bağlayıcı kimliklerin ve düzenin hesabında durur; anahtarların bilgisayarından çıkmaz.",
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
    signIn: "GITHUB ILE GIRIS",
    signOut: "CIKIS",
  },
  en: {
    back: "HOME",
    tagline: "Open source desktop universe",
    description: [
      "Universe gathers a scattered workday into one desktop: music, chat, files, notes, terminal and AI on the same screen.",
      "Your layout and connector IDs live in your account; your keys never leave your machine.",
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
    signIn: "SIGN IN WITH GITHUB",
    signOut: "SIGN OUT",
  },
} as const;

function readCachedRelease(): LatestRelease | null {
  try {
    const raw = localStorage.getItem(RELEASE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as { at: number; release: LatestRelease };
    if (Date.now() - cached.at > RELEASE_TTL) return null;

    return cached.release;
  } catch {
    return null;
  }
}

function Universe() {
  const [lang, setLang] = useState<Lang>("en");
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [release, setRelease] = useState<LatestRelease | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [account, setAccount] = useState<Account | null>(null);

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

    const cached = readCachedRelease();

    if (cached) {
      setRelease(cached);
      setState("ready");
      return;
    }

    fetchLatestRelease(REPO)
      .then((r) => {
        if (!alive) return;

        setRelease(r);
        setState(r ? "ready" : "error");

        if (r) {
          try {
            localStorage.setItem(RELEASE_KEY, JSON.stringify({ at: Date.now(), release: r }));
          } catch (error) {
            console.warn(error);
          }
        }
      })
      .catch(() => {
        if (alive) setState("error");
      });

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    me()
      .then((user) => {
        if (alive) setAccount(user);
      })
      .catch(() => {
        if (alive) setAccount(null);
      });

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

    return PLATFORMS.filter((p) => p !== platform)
      .map((p) => ({ platform: p, asset: pickAsset(release.assets, p) }))
      .filter((entry): entry is { platform: Platform; asset: NonNullable<typeof entry.asset> } =>
        Boolean(entry.asset),
      );
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

        <div className="flex items-center gap-4">
          {account ? (
            <div className="flex items-center gap-3">
              {account.avatar && (
                <img
                  src={account.avatar}
                  alt=""
                  className="h-6 w-6 rounded-full border border-white/10"
                />
              )}
              <span className="font-mono text-[10px] tracking-widest text-white/50">
                {account.login}
              </span>
              <button
                type="button"
                onClick={() => logout().then(() => setAccount(null))}
                className="font-mono text-[10px] tracking-widest text-white/25 transition-colors duration-300 hover:text-white/60"
              >
                {t.signOut}
              </button>
            </div>
          ) : (
            <a
              href={signInUrl("/universe")}
              className="rounded-sm border border-violet-500/50 bg-violet-500/15 px-3 py-1.5 font-mono text-[10px] tracking-widest text-violet-200 transition-colors duration-300 hover:bg-violet-500/25 hover:text-white"
            >
              {t.signIn}
            </a>
          )}

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
            Universe
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

        <section className="mt-14 border-t border-white/[0.08] pt-10">
          <h2 className="font-mono text-[10px] tracking-widest text-white/30">{t.platforms}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {PLATFORMS.map((p) => (
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
              {primary && platform ? (
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
                  <span>{t.downloadFor(PLATFORM_LABEL[platform])}</span>
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
                        href={asset.url}
                        className="rounded-sm border border-white/10 px-4 py-2 font-mono text-[10px] tracking-widest text-white/50 transition-colors duration-300 hover:border-white/30 hover:text-white"
                      >
                        {PLATFORM_LABEL[p].toUpperCase()}
                        {formatSize(asset.size) && (
                          <span className="text-white/25"> · {formatSize(asset.size)}</span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="mt-14 border-t border-white/[0.08] pt-8">
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

export const Route = createFileRoute("/universe/")({
  component: Universe,
  head: () => ({
    meta: [
      { title: "UNIVERSE — revo667" },
      {
        name: "description",
        content: "Universe — free and open source desktop app for macOS, Windows and Linux",
      },
    ],
  }),
});
