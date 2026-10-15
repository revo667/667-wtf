import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  detectPlatform,
  fetchLatestRelease,
  formatSize,
  pickAsset,
  type LatestRelease,
  type Platform,
} from "@/lib/github-release";

export const REPO = "revo667/667-lol-skin-releases";
export const SITE = "https://667.wtf";

type Supported = Extract<Platform, "mac" | "windows">;
const LABEL: Record<Supported, string> = { mac: "macOS", windows: "Windows" };

export type LandingContent = {
  lang: "en" | "tr";
  eyebrow: string;
  h1: string;
  lead: string;
  prefer: Supported;
  downloadLabel: (platform: string) => string;
  allReleases: string;
  sections: { h2: string; paragraphs: string[]; bullets?: string[] }[];
  stepsTitle: string;
  steps: { title: string; body: string }[];
  faqTitle: string;
  faq: { q: string; a: string }[];
  related: { href: string; label: string }[];
  back: string;
};

function useRelease() {
  const [release, setRelease] = useState<LatestRelease | null>(null);
  useEffect(() => {
    let alive = true;
    fetchLatestRelease(REPO)
      .then((r) => alive && setRelease(r))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return release;
}

function DownloadButton({ c }: { c: LandingContent }) {
  const release = useRelease();
  const [platform, setPlatform] = useState<Platform | null>(null);
  useEffect(() => {
    const hint =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ?? navigator.platform;
    setPlatform(detectPlatform(navigator.userAgent, hint));
  }, []);
  const target: Supported = platform === "mac" || platform === "windows" ? platform : c.prefer;
  const asset = useMemo(
    () => (release ? pickAsset(release.assets, target) : null),
    [release, target],
  );
  const other: Supported = target === "mac" ? "windows" : "mac";
  const otherAsset = useMemo(
    () => (release ? pickAsset(release.assets, other) : null),
    [release, other],
  );
  const releasesUrl = release?.pageUrl ?? `https://github.com/${REPO}/releases/latest`;

  return (
    <div className="mt-9 flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={asset?.url ?? releasesUrl}
          className="inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-7 text-[15px] font-medium text-black shadow-[0_8px_40px_rgba(139,92,246,0.35)] transition hover:bg-white/90"
        >
          <span aria-hidden>↓</span>
          {c.downloadLabel(LABEL[target])}
        </a>
        {otherAsset && (
          <a
            href={otherAsset.url}
            className="inline-flex h-12 items-center rounded-full border border-white/15 px-6 text-[14px] text-white/80 transition hover:border-white/35 hover:text-white"
          >
            {LABEL[other]}
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 font-mono text-[11px] text-white/35">
        {release?.version && <span>v{release.version.replace(/^v/i, "")}</span>}
        {asset && formatSize(asset.size) && <span>{formatSize(asset.size)}</span>}
        <a
          href={releasesUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="hover:text-white/70"
        >
          {c.allReleases} ↗
        </a>
      </div>
    </div>
  );
}

export function Landing({ c }: { c: LandingContent }) {
  return (
    <div lang={c.lang} className="min-h-screen bg-black text-white/80 selection:bg-violet-500/30">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[640px] [background:radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(139,92,246,0.2),transparent_70%)]"
      />
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-6">
          <Link
            to="/667skinchanger"
            className="font-mono text-[10px] tracking-widest text-white/40 hover:text-white"
          >
            ← {c.back}
          </Link>
          <div className="flex items-center gap-2.5">
            <img src="/667-lol-skin.png" alt="667 LoL Skin" className="size-6 rounded" />
            <span className="text-[13px] font-medium text-white">667 LoL Skin</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 pb-24">
        <section className="pt-20 text-center">
          <p className="font-mono text-[11px] tracking-widest text-violet-300/80 uppercase">
            {c.eyebrow}
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight font-semibold tracking-tight text-white sm:text-6xl">
            {c.h1}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/60 sm:text-lg">
            {c.lead}
          </p>
          <DownloadButton c={c} />
        </section>

        <figure className="mt-16 overflow-hidden rounded-xl border border-white/10">
          <img
            src="/shots/champions.jpg"
            alt={
              c.lang === "tr"
                ? "667 LoL Skin şampiyon ve skin seçimi"
                : "667 LoL Skin champion and skin picker"
            }
            width={1600}
            height={1000}
            className="w-full"
          />
        </figure>

        {c.sections.map((s) => (
          <section key={s.h2} className="mt-16">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              {s.h2}
            </h2>
            {s.paragraphs.map((p) => (
              <p key={p} className="mt-4 text-[15px] leading-relaxed text-white/60">
                {p}
              </p>
            ))}
            {s.bullets && (
              <ul className="mt-4 space-y-2">
                {s.bullets.map((b) => (
                  <li key={b} className="flex gap-2.5 text-[15px] text-white/70">
                    <span className="text-violet-400">✓</span>
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <section className="mt-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {c.stepsTitle}
          </h2>
          <ol className="mt-6 space-y-3">
            {c.steps.map((s, i) => (
              <li
                key={s.title}
                className="flex gap-4 rounded-xl border border-white/10 bg-neutral-950 p-5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white font-mono text-[13px] text-black">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[15px] font-medium text-white">{s.title}</h3>
                  <p className="mt-1 text-[14px] leading-relaxed text-white/55">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16">
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {c.faqTitle}
          </h2>
          <div className="mt-6 divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {c.faq.map((f) => (
              <details key={f.q} className="group py-5" open>
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[15px] font-medium text-white [&::-webkit-details-marker]:hidden">
                  <h3>{f.q}</h3>
                  <span className="text-white/40 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] leading-relaxed text-white/55">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <DownloadButton c={c} />

        <nav className="mt-16 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-white/40">
          {c.related.map((r) => (
            <a key={r.href} href={r.href} className="hover:text-white">
              {r.label}
            </a>
          ))}
        </nav>
      </main>
    </div>
  );
}

export function landingHead(
  c: LandingContent,
  path: string,
  title: string,
  description: string,
  alternates: { lang: string; href: string }[],
) {
  const url = `${SITE}${path}`;
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "667 LoL Skin",
      applicationCategory: "GameApplication",
      operatingSystem: "Windows 10, Windows 11, macOS (Apple Silicon)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url,
      image: `${SITE}/shots/champions.jpg`,
      downloadUrl: `https://github.com/${REPO}/releases/latest`,
      inLanguage: c.lang,
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: c.stepsTitle,
      inLanguage: c.lang,
      step: c.steps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.title,
        text: s.body,
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      inLanguage: c.lang,
      mainEntity: c.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: `${SITE}/shots/champions.jpg` },
      { property: "og:locale", content: c.lang === "tr" ? "tr_TR" : "en_US" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "canonical", href: url },
      ...alternates.map((a) => ({ rel: "alternate", hrefLang: a.lang, href: a.href })),
    ],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(structured) }],
  };
}
