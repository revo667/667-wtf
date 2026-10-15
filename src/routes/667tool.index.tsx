import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  detectPlatform,
  fetchLatestRelease,
  formatSize,
  pickAsset,
  type LatestRelease,
  type Platform,
} from "@/lib/github-release";

const RELEASE_REPO = "revo667/667-tool-releases";

const DL_COPY = {
  tr: {
    mac: "macOS için indir",
    windows: "Windows için indir",
    releases: "Sürümlere git",
    all: "Tüm sürümler",
    otherMac: "macOS (.dmg)",
    otherWin: "Windows (.exe)",
  },
  en: {
    mac: "Download for macOS",
    windows: "Download for Windows",
    releases: "View releases",
    all: "All releases",
    otherMac: "macOS (.dmg)",
    otherWin: "Windows (.exe)",
  },
} as const;

function Tool667Download({ lang, secondaryLabel }: { lang: "tr" | "en"; secondaryLabel: string }) {
  const [release, setRelease] = useState<LatestRelease | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const copy = DL_COPY[lang];

  useEffect(() => {
    let alive = true;
    fetchLatestRelease(RELEASE_REPO)
      .then((r) => alive && setRelease(r))
      .catch(() => undefined);
    const hint =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ?? navigator.platform;
    setPlatform(detectPlatform(navigator.userAgent, hint));
    return () => {
      alive = false;
    };
  }, []);

  const target: "mac" | "windows" = platform === "windows" ? "windows" : "mac";
  const other: "mac" | "windows" = target === "mac" ? "windows" : "mac";
  const asset = useMemo(
    () => (release ? pickAsset(release.assets, target) : null),
    [release, target],
  );
  const otherAsset = useMemo(
    () => (release ? pickAsset(release.assets, other) : null),
    [release, other],
  );
  const releasesUrl = release?.pageUrl ?? `https://github.com/${RELEASE_REPO}/releases/latest`;
  const primaryLabel = asset ? copy[target] : copy.releases;

  return (
    <div className="mt-9 flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <a
          href={asset?.url ?? releasesUrl}
          {...(asset ? {} : { target: "_blank", rel: "noreferrer" })}
          className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-black transition-transform hover:scale-[1.02]"
        >
          <span aria-hidden>↓</span>
          {primaryLabel}
        </a>
        {otherAsset && (
          <a
            href={otherAsset.url}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
          >
            {other === "mac" ? copy.otherMac : copy.otherWin}
          </a>
        )}
        <a
          href="#features"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-[13px] font-medium text-white/80 transition-colors hover:border-white/30 hover:text-white"
        >
          {secondaryLabel}
        </a>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 font-mono text-[11px] text-white/35">
        {release?.version && <span>{release.version.replace(/^v/i, "")}</span>}
        {asset && formatSize(asset.size) && <span>{formatSize(asset.size)}</span>}
        <a
          href={releasesUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="hover:text-white/70"
        >
          {copy.all} ↗
        </a>
      </div>
    </div>
  );
}
import {
  Trash2,
  UserSearch,
  FileDown,
  Radar,
  Video,
  Repeat2,
  LayoutDashboard,
  Search,
  Download,
  Play,
  Check as CheckIcon,
  CloudRain,
  Lock,
  KeyRound,
  Server,
  Hash,
  PiggyBank,
  type LucideIcon,
} from "lucide-react";

const LANG_KEY = "toolLang";

type Lang = "tr" | "en";

const TOOL_ICONS: LucideIcon[] = [
  Trash2,
  UserSearch,
  FileDown,
  Radar,
  Video,
  Repeat2,
  PiggyBank,
  LayoutDashboard,
];
const TOOL_IDS = [
  "dm-cleaner",
  "profile-lookup",
  "dm-exporter",
  "osint",
  "video-downloader",
  "tiktok-repost-cleaner",
  "admin",
] as const;

const SHOW_IDS = [
  "dm-cleaner",
  "osint",
  "video-downloader",
  "dm-exporter",
  "profile-lookup",
  "tiktok-repost-cleaner",
] as const;

type Tool = { name: string; tagline: string; body: string };
type Pillar = { tag: string; title: string; body: string; points: string[] };
type Faq = { q: string; a: string };

const COPY: Record<
  Lang,
  {
    back: string;
    badge: string;
    title: string;
    lead: string;
    ctaPrimary: string;
    ctaSecondary: string;
    trust: string[];
    showcase: string;
    tools: Tool[];
    stats: [string, string][];
    featuresEyebrow: string;
    featuresTitle: string;
    whyEyebrow: string;
    whyTitle: string;
    pillars: Pillar[];
    themesEyebrow: string;
    themesTitle: string;
    themesBody: string;
    rainLabel: string;
    faqTitle: string;
    faq: Faq[];
    ctaTitle: string;
    ctaBody: string;
    follow: string;
    status: string;
    tos: string;
  }
> = {
  tr: {
    back: "ANA SAYFA",
    badge: "YAKINDA · YEREL DISCORD & WEB ARAÇ SETİ",
    title: "Discord araçların. Tek yerde, kendi makinende.",
    lead: "667 Tool, Discord hesabın ve sosyal medya için küçük güçlü araçları tek bir arayüzde toplar. Her şey kendi bilgisayarında çalışır — token'ın yalnızca kendi makinendeki sunucuya gider, başka hiçbir yere değil.",
    ctaPrimary: "GitHub'da takip et",
    ctaSecondary: "Özellikleri gör",
    trust: ["Yerel çalışır", "Token toplamaz", "Sistem anahtarlığı"],
    showcase: "Uygulamayı gez",
    tools: [
      {
        name: "DM Cleaner",
        tagline: "Kendi DM'lerini temizle",
        body: "Deneme çalıştırması, zaman ve kelime filtreleri, canlı log ve CSV dışa aktarma. Kapalı DM'leri ID ile aç.",
      },
      {
        name: "Profile Lookup",
        tagline: "ID ile kullanıcı incele",
        body: "Rozetler, hesap tarihi, bio ve bağlı hesaplar. Avatar, banner ve rozetleri indir.",
      },
      {
        name: "DM Exporter",
        tagline: "Konuşmaları dışa aktar",
        body: "Bir DM'i ya da kanalı JSON, TXT veya HTML olarak kaydet. İstersen medyayı da .zip içine al.",
      },
      {
        name: "OSINT",
        tagline: "Açık kaynak istihbarat",
        body: "Alan adı, DNS, WHOIS, SSL, IP/ASN, URLScan, Wayback ve Discord snowflake/davet bilgisi.",
      },
      {
        name: "Video Downloader",
        tagline: "Video & ses indir",
        body: "TikTok, X, Instagram, Reddit ve YouTube videolarını MP4 ya da MP3 olarak indir.",
      },
      {
        name: "TikTok Repost Cleaner",
        tagline: "Repost'ları temizle",
        body: "Kendi TikTok profilindeki repost'ları uygulama içinde oturum açarak kaldır.",
      },
      {
        name: "Scraper",
        tagline: "Rare Badge tespiti",
        body: "Hedeflenen sunucudaki Early, Bot Developer, HypeSquad benzeri isaretlenen badgeleri tespit et.",
      },
      {
        name: "Admin Panel",
        tagline: "Panelini göm",
        body: "panel.667.wtf yönetim panelini uygulamanın içinde aç.",
      },
    ],
    stats: [
      ["7", "araç"],
      ["%100", "yerel"],
      ["0", "veri toplama"],
      ["7", "tema"],
    ],
    featuresEyebrow: "Araçlar",
    featuresTitle: "Bir pencerede yedi araç.",
    whyEyebrow: "Neden 667 Tool",
    whyTitle: "Gizlilik bir sonradan ekleme değil, temel.",
    pillars: [
      {
        tag: "01 · Yerel",
        title: "Her şey senin makinende",
        body: "Arayüz ve sunucu yalnızca localhost'ta çalışır. Token'ın yalnızca kendi bilgisayarındaki sunucuya gider; dışarıya hiçbir veri çıkmaz.",
        points: ["Sadece localhost", "Dışa veri aktarımı yok", "Açık kaynak"],
      },
      {
        tag: "02 · Token",
        title: "Token'ını toplamaz",
        body: "Discord uygulamasından, tarayıcıdan ya da diskten token okumaz. Yalnızca senin elle girdiğin token'ı kullanır; oturum boyunca bellekte tutulur.",
        points: [
          "Otomatik token çıkarma yok",
          "Bellekte, düz dosyada değil",
          "İstersen OS anahtarlığı",
        ],
      },
      {
        tag: "03 · Güvenli depolama",
        title: "Sistem anahtarlığı",
        body: "“Hatırla” dersen token işletim sisteminin anahtarlığına (Keychain / Credential Manager / Secret Service) şifreli yazılır — asla düz metin dosyasına değil.",
        points: ["Keychain · Credential Manager", "Şifreli saklama", "İstediğinde sil"],
      },
    ],
    themesEyebrow: "Görünüm",
    themesTitle: "Yedi tema ve imza yağmur efekti.",
    themesBody:
      "Siyah, mor, mavi, kırmızı, zümrüt, altın ve açık tema. Arka planda temanın rengini alan ince bir yağmur akar — istersen tek tıkla kapatırsın.",
    rainLabel: "Yağmur efekti",
    faqTitle: "Sık sorulanlar",
    faq: [
      {
        q: "667 Tool güvenli mi?",
        a: "Her şey kendi makinende, localhost'ta çalışır. Token'ın dışarıya gönderilmez, otomatik olarak toplanmaz; yalnızca senin girdiğin token kullanılır.",
      },
      {
        q: "Token'ım nerede saklanıyor?",
        a: "Varsayılan olarak yalnızca oturum boyunca bellekte. “Hatırla” dersen işletim sisteminin anahtarlığına şifreli yazılır, düz dosyaya asla.",
      },
      {
        q: "Discord ile giriş var mı?",
        a: "Evet, isteğe bağlı Discord OAuth (yalnızca ad ve profil resmi) ya da kendi hesap token'ınla giriş yapabilirsin.",
      },
      {
        q: "Hangi platformlarda çalışır?",
        a: "Masaüstü uygulaması olarak macOS'ta; arayüz yerel web olarak her yerde. Windows derlemesi de planlanıyor.",
      },
    ],
    ctaTitle: "Yayınlandığında ilk sen haberdar ol.",
    ctaBody: "667 Tool geliştirme aşamasında. İndirme bağlantısı yayınlandığında burada olacak.",
    follow: "GitHub'da takip et",
    status: "YAKINDA",
    tos: "Not: Bir Discord hesabını kullanıcı token'ı ile otomatikleştirmek Discord Hizmet Şartları'na aykırı olabilir ve hesap riski taşır. Kendi hesabında, kendi sorumluluğunda kullan. Silinen mesajlar geri getirilemez.",
  },
  en: {
    back: "HOME",
    badge: "COMING SOON · LOCAL DISCORD & WEB TOOLKIT",
    title: "Your Discord tools. One place, your machine.",
    lead: "667 Tool brings small, powerful tools for your Discord account and social media into one interface. Everything runs on your own computer — your token only ever reaches the server on your machine, nowhere else.",
    ctaPrimary: "Follow on GitHub",
    ctaSecondary: "See features",
    trust: ["Runs locally", "No token grabbing", "OS keychain"],
    showcase: "Explore the app",
    tools: [
      {
        name: "DM Cleaner",
        tagline: "Clean your own DMs",
        body: "Dry-run, time and keyword filters, a live log and CSV export. Reopen closed DMs by user ID.",
      },
      {
        name: "Profile Lookup",
        tagline: "Inspect a user by ID",
        body: "Badges, account date, bio and connected accounts. Download avatar, banner and badges.",
      },
      {
        name: "DM Exporter",
        tagline: "Export conversations",
        body: "Save a DM or channel as JSON, TXT or HTML. Optionally bundle the media into a .zip.",
      },
      {
        name: "OSINT",
        tagline: "Open-source intel",
        body: "Domain, DNS, WHOIS, SSL, IP/ASN, URLScan, Wayback and Discord snowflake/invite info.",
      },
      {
        name: "Video Downloader",
        tagline: "Download video & audio",
        body: "Grab videos from TikTok, X, Instagram, Reddit and YouTube as MP4 or MP3.",
      },
      {
        name: "TikTok Repost Cleaner",
        tagline: "Clear your reposts",
        body: "Remove reposts from your own TikTok profile by signing in inside the app.",
      },
      {
        name: "Scraper",
        tagline: "Find rare Discord badges",
        body: "Find users who has rare Discord Badges like Early Supporter, Verified Bot Developer on a server.",
      },
      {
        name: "Admin Panel",
        tagline: "Embed your panel",
        body: "Open the panel.667.wtf admin panel right inside the app.",
      },
    ],
    stats: [
      ["7", "tools"],
      ["100%", "local"],
      ["0", "data collected"],
      ["7", "themes"],
    ],
    featuresEyebrow: "Tools",
    featuresTitle: "Seven tools in one window.",
    whyEyebrow: "Why 667 Tool",
    whyTitle: "Privacy is the foundation, not an afterthought.",
    pillars: [
      {
        tag: "01 · Local",
        title: "Everything on your machine",
        body: "The UI and server run on localhost only. Your token reaches only the server on your own computer; no data ever leaves it.",
        points: ["localhost only", "No data exfiltration", "Open source"],
      },
      {
        tag: "02 · Token",
        title: "It never grabs your token",
        body: "It doesn't read tokens from the Discord app, your browser or disk. It only uses the token you type, kept in memory for the session.",
        points: ["No auto token extraction", "In memory, not plain files", "Optional OS keychain"],
      },
      {
        tag: "03 · Secure storage",
        title: "System keychain",
        body: "If you choose “Remember”, the token is written encrypted to your OS keychain (Keychain / Credential Manager / Secret Service) — never to a plaintext file.",
        points: ["Keychain · Credential Manager", "Encrypted at rest", "Forget any time"],
      },
    ],
    themesEyebrow: "Look & feel",
    themesTitle: "Seven themes and the signature rain.",
    themesBody:
      "Black, purple, blue, red, emerald, gold and light. A subtle rain in the active theme's color drifts behind everything — turn it off with one click.",
    rainLabel: "Rain effect",
    faqTitle: "FAQ",
    faq: [
      {
        q: "Is 667 Tool safe?",
        a: "Everything runs on your machine over localhost. Your token is never sent out or collected automatically; only the token you enter is used.",
      },
      {
        q: "Where is my token stored?",
        a: "By default only in memory for the session. If you pick “Remember”, it's written encrypted to your OS keychain, never to a plain file.",
      },
      {
        q: "Is there Discord login?",
        a: "Yes — optional Discord OAuth (name and avatar only), or sign in with your own account token.",
      },
      {
        q: "Which platforms?",
        a: "As a desktop app on macOS; the UI runs as a local web app anywhere. A Windows build is planned.",
      },
    ],
    ctaTitle: "Be the first to know when it ships.",
    ctaBody: "667 Tool is in development. The download link will live here when it's released.",
    follow: "Follow on GitHub",
    status: "COMING SOON",
    tos: "Note: automating a Discord account with a user token may violate Discord's Terms of Service and carries account risk. Use it on your own account, at your own risk. Deleted messages cannot be recovered.",
  },
};

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || shown) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown]);
  return { ref, shown };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, shown } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Spotlight({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--x", `${e.clientX - r.left}px`);
    el.style.setProperty("--y", `${e.clientY - r.top}px`);
  };
  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={`group relative overflow-hidden rounded-xl border border-white/10 bg-neutral-950 transition-colors duration-300 hover:border-white/20 ${className}`}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--x) var(--y), rgba(139,92,246,0.10), transparent 60%)",
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <span className="font-mono text-[11px] tracking-widest text-violet-300/80 uppercase">
        {eyebrow}
      </span>
      <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
    </div>
  );
}

function Check() {
  return <CheckIcon className="size-4 shrink-0 text-violet-400" strokeWidth={2.5} />;
}

const MOCK_VARS = {
  "--bg": "#07040d",
  "--surf": "#140d20",
  "--surf2": "#1b1230",
  "--txt": "#ededed",
  "--mut": "#958aa9",
  "--acc": "#a78bfa",
  "--ln": "rgba(167,139,250,0.18)",
} as React.CSSProperties;

function MockChip({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span
      className="rounded-md border px-2 py-1 text-[10px]"
      style={{
        borderColor: active ? "rgba(167,139,250,0.45)" : "var(--ln)",
        background: active ? "rgba(167,139,250,0.15)" : "var(--surf2)",
        color: active ? "var(--txt)" : "var(--mut)",
      }}
    >
      {children}
    </span>
  );
}

function MockBar({ pct, color = "var(--acc)" }: { pct: number; color?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: "var(--surf2)" }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function MockKV({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3 text-[10px]">
      <span className="w-20 shrink-0" style={{ color: "var(--mut)" }}>
        {k}
      </span>
      <span className="min-w-0 flex-1 truncate" style={{ color: "var(--txt)" }}>
        {v}
      </span>
    </div>
  );
}

function MockContent({ id }: { id: string }) {
  if (id === "dm-cleaner") {
    return (
      <div className="flex gap-3">
        <div className="hidden w-32 shrink-0 space-y-1.5 sm:block">
          {["@mel", "@kaan", "Group · 4", "@aria", "@dev"].map((n, i) => (
            <div
              key={n}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-[10px]"
              style={{
                background: i === 1 ? "rgba(167,139,250,0.15)" : "transparent",
                color: i === 1 ? "var(--txt)" : "var(--mut)",
              }}
            >
              <span className="size-4 rounded-full" style={{ background: "var(--surf2)" }} />
              {n}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            <MockChip active>Son 24 saat</MockChip>
            <MockChip>Deneme</MockChip>
            <MockChip>Ekli dosya</MockChip>
          </div>
          <MockBar pct={62} />
          <div className="space-y-1 font-mono text-[10px]">
            <div style={{ color: "#5bd68a" }}>✓ Deleted · "görüşürüz"</div>
            <div style={{ color: "var(--acc)" }}>○ Preview · "test mesajı"</div>
            <div style={{ color: "#5bd68a" }}>✓ Deleted · attachment.png</div>
            <div style={{ color: "#e5a04d" }}>! Rate limited — 1.2s</div>
          </div>
        </div>
      </div>
    );
  }
  if (id === "osint") {
    return (
      <div className="space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          <MockChip>Discord</MockChip>
          <MockChip active>Domain</MockChip>
          <MockChip>Network</MockChip>
          <MockChip>Security</MockChip>
        </div>
        <div
          className="rounded-lg border p-2.5"
          style={{ borderColor: "var(--ln)", background: "var(--surf2)" }}
        >
          <div className="mb-1.5 text-[10px]" style={{ color: "var(--acc)" }}>
            example.com · DNS
          </div>
          <div className="space-y-1">
            <MockKV k="A" v="172.66.147.243" />
            <MockKV k="NS" v="hera.ns.cloudflare.com" />
            <MockKV k="MX" v="route1.mx.cloudflare.net" />
            <MockKV k="ASN" v="AS13335 · Cloudflare" />
          </div>
        </div>
      </div>
    );
  }
  if (id === "video-downloader") {
    return (
      <div className="space-y-3">
        <div
          className="rounded-md border px-2.5 py-1.5 text-[10px]"
          style={{ borderColor: "var(--ln)", background: "var(--surf2)", color: "var(--mut)" }}
        >
          https://www.tiktok.com/@user/video/7…
        </div>
        <div className="flex gap-1.5">
          <MockChip active>Video · MP4</MockChip>
          <MockChip>Audio · MP3</MockChip>
        </div>
        <MockBar pct={72} />
        <div
          className="flex items-center justify-between text-[10px]"
          style={{ color: "var(--mut)" }}
        >
          <span>72% · 8.4 MB / 11.6 MB</span>
          <MockChip>TikTok</MockChip>
        </div>
      </div>
    );
  }
  if (id === "dm-exporter") {
    return (
      <div className="flex gap-3">
        <div className="hidden w-28 shrink-0 space-y-1 sm:block">
          <div className="flex items-center gap-1.5 text-[10px]" style={{ color: "var(--mut)" }}>
            <Server className="size-3" /> Server
          </div>
          {["# general", "# dev", "# art"].map((c, i) => (
            <div
              key={c}
              className="flex items-center gap-1.5 rounded px-1.5 py-1 text-[10px]"
              style={{
                background: i === 1 ? "rgba(167,139,250,0.15)" : "transparent",
                color: i === 1 ? "var(--txt)" : "var(--mut)",
              }}
            >
              <Hash className="size-2.5" /> {c.replace("# ", "")}
            </div>
          ))}
        </div>
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="flex gap-1.5">
            <MockChip active>JSON</MockChip>
            <MockChip>TXT</MockChip>
            <MockChip>HTML</MockChip>
          </div>
          <div
            className="flex items-center justify-between rounded-lg border px-2.5 py-2 text-[10px]"
            style={{ borderColor: "var(--ln)", background: "var(--surf2)" }}
          >
            <span style={{ color: "var(--txt)" }}>Download media (.zip)</span>
            <span
              className="flex h-3.5 w-6 items-center rounded-full p-0.5"
              style={{ background: "var(--acc)" }}
            >
              <span
                className="size-2.5 translate-x-2.5 rounded-full"
                style={{ background: "var(--bg)" }}
              />
            </span>
          </div>
          <div
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[10px] font-medium"
            style={{ background: "var(--acc)", color: "var(--bg)" }}
          >
            <Download className="size-3" /> Export
          </div>
        </div>
      </div>
    );
  }
  if (id === "profile-lookup") {
    return (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          <span
            className="size-9 rounded-full"
            style={{ background: "linear-gradient(135deg,var(--acc),#6d4fd6)" }}
          />
          <div>
            <div className="text-[11px]" style={{ color: "var(--txt)" }}>
              kiwhoi
            </div>
            <div className="text-[10px]" style={{ color: "var(--mut)" }}>
              @rrita_sy
            </div>
          </div>
          <div className="ml-auto flex gap-1">
            {["⚡", "★", "◆"].map((b) => (
              <span
                key={b}
                className="flex size-5 items-center justify-center rounded-md text-[9px]"
                style={{ background: "var(--surf2)", color: "var(--acc)" }}
              >
                {b}
              </span>
            ))}
          </div>
        </div>
        <div
          className="grid grid-cols-2 gap-1.5 rounded-lg border p-2.5"
          style={{ borderColor: "var(--ln)", background: "var(--surf2)" }}
        >
          <MockKV k="Created" v="2016-04-30" />
          <MockKV k="Nitro" v="Since 2021" />
          <MockKV k="Mutuals" v="3 servers" />
          <MockKV k="Type" v="Legacy name" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="text-[10px]" style={{ color: "var(--mut)" }}>
        Removed <span style={{ color: "var(--txt)" }}>4</span> / 12 · scanning reposts…
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="relative aspect-[9/16] rounded"
            style={{
              background:
                i < 4
                  ? "var(--surf2)"
                  : "linear-gradient(135deg,var(--surf2),rgba(167,139,250,0.2))",
            }}
          >
            {i < 4 && (
              <span
                className="absolute inset-0 flex items-center justify-center text-[10px]"
                style={{ color: "#5bd68a" }}
              >
                ✓
              </span>
            )}
          </div>
        ))}
      </div>
      <MockBar pct={33} color="#5bd68a" />
    </div>
  );
}

function MockWindow({ activeId }: { activeId: string }) {
  const activeIndex = TOOL_IDS.indexOf(activeId as (typeof TOOL_IDS)[number]);
  return (
    <div
      className="overflow-hidden rounded-xl border"
      style={{
        ...MOCK_VARS,
        borderColor: "var(--ln)",
        background: "var(--bg)",
        color: "var(--txt)",
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: "var(--ln)" }}
      >
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span
          className="ml-2 flex items-center gap-1.5 text-[10px]"
          style={{ color: "var(--mut)" }}
        >
          <img src="/667-tool.png" alt="" className="size-3.5 rounded" /> 667 Tool
        </span>
      </div>
      <div className="flex" style={{ minHeight: 230 }}>
        <aside
          className="hidden w-40 shrink-0 flex-col border-r p-2 sm:flex"
          style={{ borderColor: "var(--ln)", background: "var(--surf)" }}
        >
          <div className="mb-2 flex items-center gap-2 px-1.5 py-1">
            <span
              className="flex size-6 items-center justify-center rounded-lg text-[11px] font-bold"
              style={{ background: "var(--acc)", color: "var(--bg)" }}
            >
              6
            </span>
            <span className="text-[11px] font-semibold">667 Tool</span>
          </div>
          <nav className="space-y-0.5">
            {TOOL_IDS.map((id, i) => {
              const Icon = TOOL_ICONS[i]!;
              const active = id === activeId;
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px]"
                  style={{
                    background: active ? "rgba(167,139,250,0.15)" : "transparent",
                    color: active ? "var(--txt)" : "var(--mut)",
                    boxShadow: active ? "inset 0 0 0 1px rgba(167,139,250,0.3)" : "none",
                  }}
                >
                  <Icon className="size-3" />
                  {COPY.en.tools[i]?.name}
                </div>
              );
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1 p-3.5">
          <div className="mb-2.5">
            <div className="text-[12px] font-semibold">{COPY.en.tools[activeIndex]?.name}</div>
            <div className="text-[10px]" style={{ color: "var(--mut)" }}>
              {COPY.en.tools[activeIndex]?.tagline}
            </div>
          </div>
          <MockContent id={activeId} />
        </div>
      </div>
    </div>
  );
}

function Showcase({ t }: { t: (typeof COPY)["en"] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);
  const DURATION = 4200;
  const ids = SHOW_IDS;

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => {
      setActive((a) => (a + 1) % ids.length);
      setTick((x) => x + 1);
    }, DURATION);
    return () => clearTimeout(id);
  }, [active, paused, ids.length, tick]);

  const activeId = ids[active]!;
  const toolIndex = TOOL_IDS.indexOf(activeId);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5">
        <span className="mr-2 hidden font-mono text-[11px] tracking-widest text-white/35 uppercase sm:inline">
          {t.showcase}
        </span>
        {ids.map((id, i) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setActive(i);
              setPaused(true);
            }}
            className={`relative overflow-hidden rounded-full border px-3.5 py-1.5 text-[12px] transition-colors ${
              i === active
                ? "border-white/25 bg-white/[0.08] text-white"
                : "border-white/10 text-white/50 hover:text-white"
            }`}
          >
            {COPY.en.tools[TOOL_IDS.indexOf(id)]?.name}
            {i === active && !paused && (
              <span
                key={`${active}-${tick}`}
                className="absolute inset-x-0 bottom-0 h-px origin-left bg-violet-400"
                style={{ animation: `tool-progress ${DURATION}ms linear forwards` }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="relative rounded-2xl border border-white/10 bg-neutral-950 p-1.5 shadow-[0_40px_120px_-20px_rgba(139,92,246,0.35)]">
        <MockWindow activeId={activeId} />
      </div>
      <p className="mt-4 text-center text-[14px] text-white/50">{t.tools[toolIndex]?.body}</p>
      <style>{`@keyframes tool-progress { from { transform: scaleX(0) } to { transform: scaleX(1) } }`}</style>
    </div>
  );
}

const THEME_SWATCHES: { name: string; bg: string; acc: string }[] = [
  { name: "Siyah", bg: "#000000", acc: "#ffffff" },
  { name: "Mor", bg: "#07040d", acc: "#a78bfa" },
  { name: "Mavi", bg: "#03060c", acc: "#4f8dff" },
  { name: "Kırmızı", bg: "#080404", acc: "#f2555a" },
  { name: "Zümrüt", bg: "#030806", acc: "#34d399" },
  { name: "Altın", bg: "#080603", acc: "#f0b64a" },
  { name: "Açık", bg: "#f4f6fb", acc: "#2563eb" },
];

function ToolPage() {
  const [lang, setLang] = useState<Lang>("en");
  const t = COPY[lang];

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "tr" || saved === "en") setLang(saved);
    else if (navigator.language?.toLowerCase().startsWith("tr")) setLang("tr");
  }, []);

  const pickLang = (next: Lang) => {
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
  };

  return (
    <div className="min-h-screen bg-black text-white/80 selection:bg-violet-500/30">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_50%_0%,black_30%,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[720px] [background:radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(139,92,246,0.22),transparent_70%)]"
      />

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link
            to="/"
            className="group flex items-center gap-2 font-mono text-[10px] tracking-widest text-white/40 transition-colors hover:text-white"
          >
            <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">
              ←
            </span>
            {t.back}
          </Link>
          <div className="flex items-center gap-2.5">
            <img src="/667-tool.png" alt="" className="size-6 rounded" />
            <span className="text-[13px] font-medium text-white">667 Tool</span>
          </div>
          <div className="flex items-center rounded-full border border-white/10 p-0.5 font-mono text-[10px] tracking-widest">
            {(["tr", "en"] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => pickLang(code)}
                className={`rounded-full px-2.5 py-1 transition-colors ${lang === code ? "bg-white text-black" : "text-white/40 hover:text-white"}`}
              >
                {code.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pt-20 text-center sm:pt-28">
          <Reveal>
            <h1 className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] font-normal text-white/60">
              <span className="size-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_2px_rgba(139,92,246,0.7)]" />
              {t.badge}
            </h1>
          </Reveal>
          <Reveal delay={80}>
            <p className="mx-auto mt-6 max-w-4xl bg-gradient-to-b from-white to-white/60 bg-clip-text font-[family-name:var(--font-display)] text-5xl leading-[1.02] font-semibold tracking-[-0.04em] text-transparent sm:text-7xl">
              {t.title}
            </p>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg">
              {t.lead}
            </p>
          </Reveal>
          <Reveal delay={240}>
            <Tool667Download lang={lang} secondaryLabel={t.ctaSecondary} />
          </Reveal>
          <Reveal delay={320}>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/50">
              {t.trust.map((x) => (
                <span key={x} className="flex items-center gap-2">
                  <Check />
                  {x}
                </span>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="mx-auto mt-16 max-w-5xl px-6 sm:mt-20">
          <Reveal>
            <Showcase t={t} />
          </Reveal>
          <Reveal>
            <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-4">
              {t.stats.map(([n, l]) => (
                <div key={l} className="bg-black px-6 py-5 text-center">
                  <div className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white">
                    {n}
                  </div>
                  <div className="mt-1 text-[13px] text-white/45">{l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section id="features" className="mx-auto mt-32 max-w-6xl px-6">
          <SectionHead eyebrow={t.featuresEyebrow} title={t.featuresTitle} />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {t.tools.map((tool, i) => {
              const Icon = TOOL_ICONS[i]!;
              return (
                <Reveal key={tool.name} delay={(i % 3) * 90}>
                  <Spotlight className="h-full">
                    <div className="flex h-full flex-col p-6">
                      <div className="flex size-10 items-center justify-center rounded-xl border border-violet-400/20 bg-violet-500/10 text-violet-300">
                        <Icon className="size-5" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold tracking-tight text-white">
                        {tool.name}
                      </h3>
                      <p className="mt-1 text-[12px] text-violet-300/70">{tool.tagline}</p>
                      <p className="mt-3 text-[14px] leading-relaxed text-white/55">{tool.body}</p>
                    </div>
                  </Spotlight>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="mx-auto mt-32 max-w-6xl px-6">
          <SectionHead eyebrow={t.whyEyebrow} title={t.whyTitle} />
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {t.pillars.map((p, i) => (
              <Reveal key={p.tag} delay={i * 90}>
                <Spotlight className="h-full">
                  <div className="flex h-full flex-col p-6">
                    <div className="mb-6 flex h-28 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02]">
                      {i === 0 ? (
                        <Lock className="size-10 text-violet-300/80" />
                      ) : i === 1 ? (
                        <KeyRound className="size-10 text-violet-300/80" />
                      ) : (
                        <Server className="size-10 text-violet-300/80" />
                      )}
                    </div>
                    <span className="font-mono text-[11px] tracking-widest text-violet-300/80 uppercase">
                      {p.tag}
                    </span>
                    <h3 className="mt-2 text-xl font-semibold tracking-tight text-white">
                      {p.title}
                    </h3>
                    <p className="mt-3 text-[14px] leading-relaxed text-white/55">{p.body}</p>
                    <ul className="mt-5 space-y-2 border-t border-white/[0.06] pt-5">
                      {p.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2.5 text-[13px] text-white/70">
                          <Check />
                          {pt}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Spotlight>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-32 max-w-6xl px-6">
          <SectionHead eyebrow={t.themesEyebrow} title={t.themesTitle} />
          <Reveal>
            <p className="mx-auto mt-5 max-w-2xl text-center text-[14px] leading-relaxed text-white/55">
              {t.themesBody}
            </p>
          </Reveal>
          <Reveal>
            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {THEME_SWATCHES.map((s) => (
                <div key={s.name} className="overflow-hidden rounded-xl border border-white/10">
                  <div className="relative h-20" style={{ background: s.bg }}>
                    <span
                      className="absolute left-3 top-3 size-6 rounded-full"
                      style={{ background: s.acc, boxShadow: `0 0 16px 2px ${s.acc}55` }}
                    />
                    <span
                      className="absolute bottom-3 left-3 right-3 h-1.5 rounded-full"
                      style={{ background: s.acc, opacity: 0.4 }}
                    />
                  </div>
                  <div className="bg-black px-3 py-2 text-center text-[12px] text-white/60">
                    {s.name}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal>
            <div className="mt-5 flex items-center justify-center gap-2 text-[13px] text-white/50">
              <CloudRain className="size-4 text-violet-300/80" />
              {t.rainLabel}
            </div>
          </Reveal>
        </section>

        <section className="mx-auto mt-32 max-w-3xl px-6">
          <SectionHead eyebrow="FAQ" title={t.faqTitle} />
          <div className="mt-10 space-y-3">
            {t.faq.map((f, i) => (
              <Reveal key={f.q} delay={i * 60}>
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                  <h3 className="text-[15px] font-semibold text-white">{f.q}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/55">{f.a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-32 max-w-3xl px-6 pb-24 text-center">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-violet-500/[0.08] to-transparent p-10">
              <img src="/667-tool.png" alt="" className="mx-auto size-16 rounded-2xl" />
              <h2 className="mt-5 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                {t.ctaTitle}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-white/55">
                {t.ctaBody}
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <span className="rounded-full border border-violet-400/30 bg-violet-500/10 px-3 py-1 font-mono text-[11px] tracking-widest text-violet-200">
                  {t.status}
                </span>
                <a
                  href="https://github.com/revo667"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-medium text-black transition-transform hover:scale-[1.02]"
                >
                  {t.follow}
                </a>
              </div>
            </div>
          </Reveal>
          <Reveal>
            <p className="mx-auto mt-8 max-w-2xl text-[12px] leading-relaxed text-white/35">
              {t.tos}
            </p>
          </Reveal>
        </section>
      </main>
    </div>
  );
}

export const Route = createFileRoute("/667tool/")({
  component: ToolPage,
});
