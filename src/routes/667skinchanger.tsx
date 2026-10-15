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

const REPO = "revo667/667-lol-skin-releases";
const LANG_KEY = "skinchangerLang";

type Lang = "tr" | "en";
type Supported = Extract<Platform, "mac" | "windows">;

const PLATFORMS: Supported[] = ["mac", "windows"];
const PLATFORM_LABEL: Record<Supported, string> = { mac: "macOS", windows: "Windows" };
const PLATFORM_NOTE: Record<Supported, string> = {
  mac: "Apple Silicon",
  windows: "Windows 10 / 11",
};

type Shot = { id: string; src: string; label: string; desc: string };
type Pillar = { tag: string; title: string; body: string; points: string[] };
type Feature = { title: string; body: string; wide?: boolean };
type Faq = { q: string; a: string };

const COPY: Record<
  Lang,
  {
    back: string;
    eyebrow: string;
    title: string;
    lead: string;
    trust: string[];
    downloadFor: (p: string) => string;
    download: string;
    allReleases: string;
    loading: string;
    notReleased: string;
    noAsset: string;
    unsupported: string;
    version: string;
    otherPlatforms: string;
    stats: [string, string][];
    showcase: string;
    shots: Shot[];
    whyEyebrow: string;
    whyTitle: string;
    pillars: Pillar[];
    repairDemo: { broken: string; fixing: string; fixed: string; mod: string };
    updateDemo: string[];
    securityDemo: string[];
    featuresEyebrow: string;
    featuresTitle: string;
    features: Feature[];
    securityEyebrow: string;
    securityTitle: string;
    securityBody: string;
    securityNever: string;
    securityList: string[];
    faqTitle: string;
    faq: Faq[];
    ctaTitle: string;
    ctaBody: string;
  }
> = {
  tr: {
    back: "ANA SAYFA",
    eyebrow: "League of Legends Skin Changer",
    title: "Her skin. Hiç bozulmadan.",
    lead: "Windows ve macOS için ücretsiz LoL skin changer: tüm resmi skinler ve kromalar, 600'den fazla custom skin ve oyun içi 3D önizleme. LTK altyapısıyla.",
    trust: ["Otomatik onarım", "Otomatik güncelleme", "Mod dosyaları çalıştırılmaz"],
    downloadFor: (p) => `${p} için indir`,
    download: "İndir",
    allReleases: "Tüm sürümler",
    loading: "Son sürüm alınıyor…",
    notReleased: "İlk sürüm çok yakında",
    noAsset: "Bu platform için hazır dosya yok",
    unsupported: "Bu cihaz desteklenmiyor",
    version: "Sürüm",
    otherPlatforms: "Diğer platform",
    stats: [
      ["600+", "custom mod"],
      ["173", "şampiyon"],
      ["Her", "skin ve kroma"],
      ["2", "platform"],
    ],
    showcase: "Uygulamayı gez",
    shots: [
      {
        id: "champions",
        src: "/shots/champions.jpg",
        label: "Şampiyonlar",
        desc: "Skin ve kromayı seç, sete ekle, Başlat'a bas.",
      },
      {
        id: "mods",
        src: "/shots/mods.jpg",
        label: "Custom Mods",
        desc: "Modlar her başlatmada kontrol edilir, bozulan onarılır.",
      },
      {
        id: "market",
        src: "/shots/market.jpg",
        label: "Market",
        desc: "600+ custom mod, tek tıkla kütüphanene.",
      },
      {
        id: "lcu",
        src: "/shots/lcu.jpg",
        label: "LCU",
        desc: "Maçtaki 10 oyuncunun canlı analizi.",
      },
    ],
    whyEyebrow: "Neden 667",
    whyTitle: "Skin changer'larda en çok yaşanan üç sorunu çözdük.",
    pillars: [
      {
        tag: "01 · Onarım",
        title: "Bozuk skin derdi yok",
        body: "Her başlatmada etkin modların hepsi kontrol edilir. Oyunun yeni sürümüyle uyumsuz hale gelen modlar LTK'nin onarım sistemiyle otomatik düzeltilir. Onarılamayan bir mod varsa oyuna girmeden önce söylenir.",
        points: [
          "Başlatmadan önce sağlık kontrolü",
          "Tek tıkla ya da otomatik onarım",
          "Resmi skinler her yama için hazırlanmış dosyalardan",
        ],
      },
      {
        tag: "02 · Güncelleme",
        title: "Güncellemeyi kaçırmazsın",
        body: "Uygulama kendini otomatik günceller. LTK altyapısındaki düzeltmeler ve yeni LoL yamalarına uyum güncellemelerle gelir; League güncellendiğinde yeniden kurulum gerekmez.",
        points: [
          "Açılışta yeni sürüm kontrolü",
          "Tek tıkla güncelle ve yeniden başlat",
          "LTK sürümleriyle birlikte güncellenir",
        ],
      },
      {
        tag: "03 · Güvenlik",
        title: "Bilgilerin güvende",
        body: "Kötü amaçlı .fantome ve .wad dosyalarıyla bilgisayarlara sızılmaya çalışılıyor. 667 mod dosyalarını asla çalıştırmaz: içerikleri yalnızca oyun verisi olarak okunur, içine gizlenmiş programlar hiçbir zaman çalışmaz.",
        points: [
          "Mod içindeki programlar çalıştırılmaz",
          "Oyun dosyalarına yazılmaz",
          "Discord'dan sadece ad ve profil resmi",
        ],
      },
    ],
    repairDemo: {
      broken: "Onarılabilir",
      fixing: "Onarılıyor",
      fixed: "Uyumlu",
      mod: "Ahri Spirit Blossom VFX",
    },
    updateDemo: ["Yeni sürüm bulundu", "İndiriliyor", "Güncel"],
    securityDemo: [".fantome açıldı", "Oyun verisi okundu", "Program çalıştırılmadı"],
    featuresEyebrow: "Özellikler",
    featuresTitle: "İhtiyacın olan her şey tek uygulamada.",
    features: [
      {
        title: "Custom Mods Market",
        body: "600'den fazla custom skin, HUD ve efekt; şampiyona göre gruplu, aranabilir. Tek tıkla kütüphanene eklenir, kendi kart görseliyle.",
        wide: true,
      },
      {
        title: "Oyun içi 3D önizleme",
        body: "Skinin, kromanın ya da custom modun oyunda nasıl göründüğünü indirmeden önce 3D incele.",
      },
      {
        title: "Her skin, her kroma",
        body: "Tüm resmi skinler ve kromalar, her yama için hazırlanmış dosyalardan.",
      },
      {
        title: "Canlı maç analizi",
        body: "Şampiyon seçiminden itibaren 10 oyuncunun rütbesi, o şampiyonla maçları, serileri ve etiketleri.",
      },
      {
        title: "macOS ve Windows",
        body: "Apple Silicon Mac'lerde ve Windows 10/11'de aynı özelliklerle çalışır.",
      },
      {
        title: "Discord ile tek giriş",
        body: "Bir kez giriş yap, kayıtlı kalsın. Discord durumunda oyun modun ve setin görünür.",
        wide: true,
      },
      { title: "Tamamen ücretsiz", body: "Reklam yok, abonelik yok, kilitli özellik yok." },
    ],
    securityEyebrow: "Güvenlik",
    securityTitle: "Güvenli olacak şekilde tasarlandı.",
    securityBody:
      "Custom mod dosyaları sadece doku, model ve ses taşır. Bazı kötü niyetli paketler bunların içine program gizleyip bilgisayara erişmeye çalışır. 667 bu dosyaları yalnızca veri olarak okur; hiçbir koşulda çalıştırmaz.",
    securityNever: "667'nin asla yapmadıkları",
    securityList: [
      "Mod dosyalarının içindeki programları çalıştırmak",
      "Oyun dosyalarını değiştirmek (değişiklikler ayrı bir katmandan yüklenir)",
      "E-posta, şifre, mesaj ya da arkadaş listeni istemek",
      "Discord hesabında senin adına işlem yapmak",
    ],
    faqTitle: "Sık sorulanlar",
    faq: [
      { q: "Ücretsiz mi?", a: "Evet, tamamen ücretsiz." },
      {
        q: "Skinleri başkaları görür mü?",
        a: "Hayır. Değişiklikler sadece senin bilgisayarında görünür; diğer oyuncular kendi skinlerini görür.",
      },
      {
        q: "League güncellenince ne olur?",
        a: "Uygulama kendini otomatik günceller, modlar başlatmadan önce kontrol edilip gerekirse onarılır. Yeniden kurman gerekmez.",
      },
      {
        q: "Neden Discord ile giriş?",
        a: "Market ve uygulama erişimi için. Sadece Discord'un 'identify' izni istenir: kullanıcı adın ve profil resmin. E-posta, sunucular ve mesajlar alınmaz.",
      },
      {
        q: "Hesabım için risk var mı?",
        a: "Skinler sadece senin ekranında görünür, oyun dosyalarına yazılmaz ve hiçbir hile özelliği yoktur. Yine de Riot üçüncü parti araçları resmi olarak desteklemez; kullanım sorumluluğu sana aittir.",
      },
    ],
    ctaTitle: "Hazır mısın?",
    ctaBody: "İndir, Discord ile bir kez giriş yap, skinini seç.",
  },
  en: {
    back: "HOME",
    eyebrow: "League of Legends Skin Changer",
    title: "Every skin. Never broken.",
    lead: "The free LoL skin changer for Windows and macOS: every official skin and chroma, 600+ custom skins and in-game 3D previews. Built on LTK.",
    trust: ["Auto-repair", "Auto-updates", "Mod files never executed"],
    downloadFor: (p) => `Download for ${p}`,
    download: "Download",
    allReleases: "All releases",
    loading: "Fetching latest release…",
    notReleased: "First release coming soon",
    noAsset: "No build available for this platform",
    unsupported: "This device is not supported",
    version: "Version",
    otherPlatforms: "Other platform",
    stats: [
      ["600+", "custom mods"],
      ["173", "champions"],
      ["Every", "skin & chroma"],
      ["2", "platforms"],
    ],
    showcase: "Take a tour",
    shots: [
      {
        id: "champions",
        src: "/shots/champions.jpg",
        label: "Champions",
        desc: "Pick a skin or chroma, add it to your set, hit Start.",
      },
      {
        id: "mods",
        src: "/shots/mods.jpg",
        label: "Custom Mods",
        desc: "Mods are checked on every start; broken ones get repaired.",
      },
      {
        id: "market",
        src: "/shots/market.jpg",
        label: "Market",
        desc: "600+ custom mods, one click to your library.",
      },
      {
        id: "lcu",
        src: "/shots/lcu.jpg",
        label: "LCU",
        desc: "Live analysis of all 10 players in your game.",
      },
    ],
    whyEyebrow: "Why 667",
    whyTitle: "We fixed the three things that go wrong with skin changers.",
    pillars: [
      {
        tag: "01 · Repair",
        title: "No more broken skins",
        body: "Every enabled mod is checked on each start. Mods that break with a new game version are fixed automatically by LTK's repair system. If something can't be repaired, you're told before you queue up.",
        points: [
          "Health check before every start",
          "One-click or automatic repair",
          "Official skins from files prepared for each patch",
        ],
      },
      {
        tag: "02 · Updates",
        title: "Never miss an update",
        body: "The app updates itself. LTK fixes and compatibility with new LoL patches ship as updates, so you don't reinstall when League updates.",
        points: [
          "Checks for new versions on launch",
          "Update and restart in one click",
          "Tracks LTK releases",
        ],
      },
      {
        tag: "03 · Security",
        title: "Your data stays yours",
        body: "Malicious .fantome and .wad files are used to break into people's computers. 667 never executes mod files: their contents are only read as game data, and anything hidden inside never runs.",
        points: [
          "Programs inside mods are never run",
          "Game files are never modified",
          "Only your Discord name and avatar",
        ],
      },
    ],
    repairDemo: {
      broken: "Repairable",
      fixing: "Repairing",
      fixed: "Compatible",
      mod: "Ahri Spirit Blossom VFX",
    },
    updateDemo: ["Update found", "Downloading", "Up to date"],
    securityDemo: [".fantome opened", "Game data read", "Nothing executed"],
    featuresEyebrow: "Features",
    featuresTitle: "Everything you need, in one app.",
    features: [
      {
        title: "Custom Mods Market",
        body: "600+ custom skins, HUDs and effects, grouped by champion and searchable. One click adds them to your library, each with its own card art.",
        wide: true,
      },
      {
        title: "In-game 3D preview",
        body: "See how a skin, chroma or custom mod looks in game, in 3D, before you use it.",
      },
      {
        title: "Every skin, every chroma",
        body: "All official skins and chromas, from files prepared for each patch.",
      },
      {
        title: "Live match analysis",
        body: "From champ select on: rank, games on that champion, streaks and tags for all 10 players.",
      },
      {
        title: "macOS and Windows",
        body: "Same features on Apple Silicon Macs and Windows 10/11.",
      },
      {
        title: "One sign-in with Discord",
        body: "Sign in once and stay signed in. Your Discord status shows your game mode and set.",
        wide: true,
      },
      { title: "Completely free", body: "No ads, no subscription, no locked features." },
    ],
    securityEyebrow: "Security",
    securityTitle: "Designed to be safe.",
    securityBody:
      "Custom mod files only carry textures, models and sounds. Some malicious packages hide programs inside them to get into your computer. 667 only reads these files as data and never executes them.",
    securityNever: "What 667 never does",
    securityList: [
      "Run programs found inside mod files",
      "Modify your game files (changes load from a separate layer)",
      "Ask for your email, password, messages or friends",
      "Act on your Discord account on your behalf",
    ],
    faqTitle: "FAQ",
    faq: [
      { q: "Is it free?", a: "Yes, completely free." },
      {
        q: "Can other players see my skins?",
        a: "No. Changes are only visible on your computer; other players see their own skins.",
      },
      {
        q: "What happens when League updates?",
        a: "The app updates itself, and mods are checked and repaired if needed before you start. No reinstall.",
      },
      {
        q: "Why sign in with Discord?",
        a: "For access to the app and the market. Only Discord's 'identify' scope is requested: your username and avatar. No email, servers or messages.",
      },
      {
        q: "Is there a risk to my account?",
        a: "Skins are only visible on your screen, game files aren't modified and there are no cheat features. Still, Riot doesn't officially support third-party tools; use it at your own discretion.",
      },
    ],
    ctaTitle: "Ready?",
    ctaBody: "Download, sign in with Discord once, pick your skin.",
  },
};

function useRelease() {
  const [release, setRelease] = useState<LatestRelease | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty">("loading");
  useEffect(() => {
    let alive = true;
    fetchLatestRelease(REPO)
      .then((r) => {
        if (!alive) return;
        setRelease(r);
        setState(r && r.assets.length ? "ready" : "empty");
      })
      .catch(() => alive && setState("empty"));
    return () => {
      alive = false;
    };
  }, []);
  return { release, state };
}

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

function SkinChanger() {
  const [lang, setLang] = useState<Lang>("en");
  const [platform, setPlatform] = useState<Platform | null>(null);
  const { release, state } = useRelease();
  const t = COPY[lang];
  const supported = platform === "mac" || platform === "windows" ? platform : null;

  useEffect(() => {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "tr" || saved === "en") setLang(saved);
    else if (navigator.language?.toLowerCase().startsWith("tr")) setLang("tr");
    const hint =
      (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData
        ?.platform ?? navigator.platform;
    setPlatform(detectPlatform(navigator.userAgent, hint));
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
            <img src="/667-lol-skin.png" alt="" className="size-6 rounded" />
            <span className="text-[13px] font-medium text-white">667 LoL Skin</span>
          </div>
          <div className="flex items-center rounded-full border border-white/10 p-0.5 font-mono text-[10px] tracking-widest">
            {(["tr", "en"] as Lang[]).map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => pickLang(code)}
                className={`rounded-full px-2.5 py-1 transition-colors ${
                  lang === code ? "bg-white text-black" : "text-white/40 hover:text-white"
                }`}
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
              {release?.version ? `v${release.version.replace(/^v/i, "")} · ` : ""}
              {t.eyebrow}
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
            <Download
              t={t}
              release={release}
              state={state}
              platform={platform}
              supported={supported}
            />
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

        <section className="mx-auto mt-16 max-w-6xl px-6 sm:mt-20">
          <Reveal>
            <Showcase shots={t.shots} label={t.showcase} />
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

        <section className="mx-auto mt-32 max-w-6xl px-6">
          <SectionHead eyebrow={t.whyEyebrow} title={t.whyTitle} />
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {t.pillars.map((p, i) => (
              <Reveal key={p.tag} delay={i * 90}>
                <Spotlight className="h-full">
                  <div className="flex h-full flex-col p-6">
                    <div className="mb-6 h-40 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">
                      {i === 0 ? (
                        <RepairDemo t={t.repairDemo} />
                      ) : i === 1 ? (
                        <UpdateDemo steps={t.updateDemo} />
                      ) : (
                        <SecurityDemo steps={t.securityDemo} />
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
                          <Check className="mt-0.5" />
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
          <SectionHead eyebrow={t.featuresEyebrow} title={t.featuresTitle} />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {t.features.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 80} className={f.wide ? "md:col-span-2" : ""}>
                <Spotlight className="h-full">
                  <div className="p-6">
                    {f.wide && i === 0 && (
                      <div className="mb-5 overflow-hidden rounded-lg border border-white/[0.08]">
                        <img
                          src="/shots/market.jpg"
                          alt=""
                          loading="lazy"
                          className="h-44 w-full object-cover object-[0%_32%] opacity-90 transition-transform duration-700 group-hover:scale-[1.02]"
                        />
                      </div>
                    )}
                    {f.wide && i !== 0 && (
                      <div className="mb-5 overflow-hidden rounded-lg border border-white/[0.08]">
                        <img
                          src="/shots/login.jpg"
                          alt=""
                          loading="lazy"
                          className="h-44 w-full object-cover object-[50%_45%] opacity-90 transition-transform duration-700 group-hover:scale-[1.02]"
                        />
                      </div>
                    )}
                    <h3 className="text-[17px] font-semibold tracking-tight text-white">
                      {f.title}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-white/55">{f.body}</p>
                  </div>
                </Spotlight>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-32 max-w-6xl px-6">
          <Reveal>
            <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 lg:grid-cols-2">
              <div className="p-8 sm:p-10">
                <span className="font-mono text-[11px] tracking-widest text-violet-300/80 uppercase">
                  {t.securityEyebrow}
                </span>
                <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {t.securityTitle}
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-white/55">{t.securityBody}</p>
              </div>
              <div className="border-t border-white/10 bg-white/[0.02] p-8 sm:p-10 lg:border-t-0 lg:border-l">
                <p className="font-mono text-[11px] tracking-widest text-white/40 uppercase">
                  {t.securityNever}
                </p>
                <ul className="mt-5 space-y-3">
                  {t.securityList.map((x) => (
                    <li
                      key={x}
                      className="flex items-start gap-3 rounded-lg border border-white/[0.06] bg-black px-4 py-3 text-[14px] text-white/75"
                    >
                      <Cross />
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>
        </section>

        <section className="mx-auto mt-32 max-w-3xl px-6">
          <SectionHead title={t.faqTitle} />
          <Reveal>
            <div className="mt-10 divide-y divide-white/[0.08] border-y border-white/[0.08]">
              {t.faq.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-[15px] font-medium text-white [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-white/15 text-white/50 transition-transform duration-300 group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 pr-10 text-[14px] leading-relaxed text-white/55">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="mx-auto mt-32 max-w-6xl px-6 pb-24">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 px-6 py-16 text-center">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_50%_80%_at_50%_100%,rgba(139,92,246,0.18),transparent_70%)]"
              />
              <div className="relative">
                <img src="/667-lol-skin.png" alt="" className="mx-auto size-14 rounded-xl" />
                <h2 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-white">
                  {t.ctaTitle}
                </h2>
                <p className="mt-3 text-[15px] text-white/55">{t.ctaBody}</p>
                <Download
                  t={t}
                  release={release}
                  state={state}
                  platform={platform}
                  supported={supported}
                  compact
                />
              </div>
            </div>
          </Reveal>
          <nav className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[13px] text-white/40">
            <a href="/lol-skin-changer-mac" className="hover:text-white">
              LoL Skin Changer for Mac
            </a>
            <a href="/tr/lol-skin-changer" className="hover:text-white">
              LoL Skin Changer (Türkçe)
            </a>
          </nav>
        </section>
      </main>
    </div>
  );
}

function SectionHead({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <Reveal className="text-center">
      {eyebrow && (
        <span className="font-mono text-[11px] tracking-widest text-violet-300/80 uppercase">
          {eyebrow}
        </span>
      )}
      <h2 className="mx-auto mt-3 max-w-2xl font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white sm:text-4xl">
        {title}
      </h2>
    </Reveal>
  );
}

function Check({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={`size-4 shrink-0 text-violet-400 ${className}`}>
      <path
        d="M3.5 8.5l3 3 6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Cross() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className="mt-0.5 size-4 shrink-0 text-white/35">
      <path
        d="M4.5 4.5l7 7M11.5 4.5l-7 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

type T = (typeof COPY)[Lang];

function Download({
  t,
  release,
  state,
  platform,
  supported,
  compact,
}: {
  t: T;
  release: LatestRelease | null;
  state: "loading" | "ready" | "empty";
  platform: Platform | null;
  supported: Supported | null;
  compact?: boolean;
}) {
  const primary = useMemo(
    () => (release && supported ? pickAsset(release.assets, supported) : null),
    [release, supported],
  );
  const others = useMemo(
    () =>
      release
        ? PLATFORMS.filter((p) => p !== supported)
            .map((p) => ({ platform: p, asset: pickAsset(release.assets, p) }))
            .filter((x) => x.asset)
        : [],
    [release, supported],
  );
  const releasesUrl = release?.pageUrl ?? `https://github.com/${REPO}/releases`;

  if (state === "loading") return <p className="mt-10 text-[13px] text-white/40">{t.loading}</p>;
  if (state === "empty" || !release)
    return (
      <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-white/10 px-5 py-2.5 text-[13px] text-white/60">
        <span className="size-1.5 animate-pulse rounded-full bg-violet-500" />
        {t.notReleased}
      </div>
    );

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {primary && supported ? (
          <a
            href={primary.url}
            className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-7 text-[15px] font-medium text-black shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_40px_rgba(139,92,246,0.35)] transition hover:bg-white/90"
          >
            <span aria-hidden className="transition-transform group-hover:translate-y-0.5">
              ↓
            </span>
            {t.downloadFor(PLATFORM_LABEL[supported])}
          </a>
        ) : (
          <a
            href={releasesUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-medium text-black transition hover:bg-white/90"
          >
            {supported ? t.noAsset : platform ? t.unsupported : t.download}{" "}
            <span aria-hidden>↗</span>
          </a>
        )}
        {!compact &&
          others.map(({ platform: p, asset }) => (
            <a
              key={p}
              href={asset!.url}
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 px-6 text-[14px] text-white/80 transition hover:border-white/35 hover:text-white"
            >
              {PLATFORM_LABEL[p]}
              <span className="text-[12px] text-white/35">{PLATFORM_NOTE[p]}</span>
            </a>
          ))}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 font-mono text-[11px] tracking-wide text-white/35">
        {release.version && (
          <span>
            {t.version} {release.version}
          </span>
        )}
        {primary && formatSize(primary.size) && <span>{formatSize(primary.size)}</span>}
        {supported && <span>{PLATFORM_NOTE[supported]}</span>}
        <a
          href={releasesUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="transition-colors hover:text-white/70"
        >
          {t.allReleases} ↗
        </a>
      </div>
    </div>
  );
}

function Showcase({ shots, label }: { shots: Shot[]; label: string }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(0);
  const DURATION = 5000;

  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => {
      setActive((a) => (a + 1) % shots.length);
      setTick((x) => x + 1);
    }, DURATION);
    return () => clearTimeout(id);
  }, [active, paused, shots.length, tick]);

  const select = (i: number) => {
    setActive(i);
    setPaused(true);
  };

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-1.5">
        <span className="mr-2 hidden font-mono text-[11px] tracking-widest text-white/35 uppercase sm:inline">
          {label}
        </span>
        {shots.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => select(i)}
            className={`relative overflow-hidden rounded-full border px-4 py-1.5 text-[13px] transition-colors ${
              i === active
                ? "border-white/25 bg-white/[0.08] text-white"
                : "border-white/10 text-white/50 hover:text-white"
            }`}
          >
            {s.label}
            {i === active && !paused && (
              <span
                key={`${active}-${tick}`}
                className="absolute inset-x-0 bottom-0 h-px origin-left bg-violet-400"
                style={{ animation: `showcase-progress ${DURATION}ms linear forwards` }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="relative rounded-2xl border border-white/10 bg-neutral-950 p-1.5 shadow-[0_40px_120px_-20px_rgba(139,92,246,0.35)]">
        <div className="relative aspect-[1600/1000] overflow-hidden rounded-xl bg-black">
          {shots.map((s, i) => (
            <img
              key={s.id}
              src={s.src}
              alt={s.label}
              width={1600}
              height={1000}
              loading={i === 0 ? "eager" : "lazy"}
              className={`absolute inset-0 size-full object-cover transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                i === active ? "scale-100 opacity-100" : "scale-[1.015] opacity-0"
              }`}
            />
          ))}
        </div>
      </div>
      <p className="mt-4 text-center text-[14px] text-white/50">{shots[active]?.desc}</p>
      <style>{`@keyframes showcase-progress { from { transform: scaleX(0) } to { transform: scaleX(1) } }`}</style>
    </div>
  );
}

function RepairDemo({ t }: { t: T["repairDemo"] }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 3), 1600);
    return () => clearInterval(id);
  }, []);
  const badge = [
    { text: `${t.broken} · 412`, cls: "border-amber-500/40 text-amber-400" },
    { text: t.fixing, cls: "border-violet-400/40 text-violet-300" },
    { text: t.fixed, cls: "border-emerald-500/40 text-emerald-400" },
  ][step]!;
  return (
    <div className="flex h-full items-center justify-center px-5">
      <div className="w-full rounded-lg border border-white/10 bg-black p-4">
        <div className="flex items-center gap-3">
          <div className="grid size-9 place-items-center rounded border border-white/10 font-mono text-[10px] text-white/50">
            FAN
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-white">{t.mod}</p>
            <span
              className={`mt-1 inline-block rounded border px-1.5 font-mono text-[10px] transition-colors duration-500 ${badge.cls}`}
            >
              {badge.text}
            </span>
          </div>
          <div
            className={`h-5 w-9 rounded-full p-0.5 transition-colors duration-500 ${step === 2 ? "bg-white" : "bg-white/15"}`}
          >
            <div
              className={`size-4 rounded-full transition-transform duration-500 ${step === 2 ? "translate-x-4 bg-black" : "bg-white/60"}`}
            />
          </div>
        </div>
        <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-violet-400 transition-all duration-[1400ms] ease-out"
            style={{ width: step === 0 ? "0%" : step === 1 ? "65%" : "100%" }}
          />
        </div>
      </div>
    </div>
  );
}

function UpdateDemo({ steps }: { steps: string[] }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 3), 1600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex h-full items-center justify-center gap-5 px-5">
      <div className="text-center">
        <div className="font-mono text-[11px] text-white/35">LTK</div>
        <div className="relative mt-1 h-8 overflow-hidden font-[family-name:var(--font-display)] text-2xl font-semibold text-white">
          <div
            className="transition-transform duration-500"
            style={{ transform: `translateY(${step === 0 ? 0 : -32}px)` }}
          >
            <div className="h-8">v1.21</div>
            <div className="h-8 text-violet-300">v1.22</div>
          </div>
        </div>
      </div>
      <div className="h-12 w-px bg-white/10" />
      <ul className="space-y-1.5">
        {steps.map((s, i) => (
          <li
            key={s}
            className={`flex items-center gap-2 text-[12px] transition-colors duration-500 ${i <= step ? "text-white" : "text-white/25"}`}
          >
            <span
              className={`size-1.5 rounded-full transition-colors duration-500 ${i < step ? "bg-emerald-400" : i === step ? "animate-pulse bg-violet-400" : "bg-white/15"}`}
            />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SecurityDemo({ steps }: { steps: string[] }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 1200);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex h-full items-center justify-center px-5">
      <div className="w-full space-y-2 font-mono text-[11px]">
        {steps.map((s, i) => (
          <div
            key={s}
            className={`flex items-center justify-between rounded border px-3 py-2 transition-all duration-500 ${
              i < step
                ? "border-white/10 bg-black text-white/80"
                : "border-transparent text-white/20"
            }`}
          >
            <span>{s}</span>
            <span className={i === 2 ? "text-emerald-400" : "text-white/40"}>
              {i < step ? (i === 2 ? "✓ 0" : "✓") : "·"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PAGE_URL = "https://667.wtf/667skinchanger";
const DESCRIPTION =
  "Free LoL skin changer for Windows and macOS. Unlock every League of Legends skin and chroma visually, 600+ custom skins, in-game 3D preview, automatic repair and updates. Mod files are never executed.";

const STRUCTURED = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "667 LoL Skin",
    alternateName: ["667 LoL Skin Changer", "LoL Skin Changer"],
    description: DESCRIPTION,
    url: PAGE_URL,
    applicationCategory: "GameApplication",
    operatingSystem: "Windows 10, Windows 11, macOS (Apple Silicon)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    image: "https://667.wtf/shots/champions.jpg",
    screenshot: [
      "https://667.wtf/shots/champions.jpg",
      "https://667.wtf/shots/market.jpg",
      "https://667.wtf/shots/mods.jpg",
    ],
    downloadUrl: "https://github.com/revo667/667-lol-skin-releases/releases/latest",
    author: { "@type": "Person", name: "revo667", url: "https://667.wtf/" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: COPY.en.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  },
];

export const Route = createFileRoute("/667skinchanger")({
  component: SkinChanger,
  head: () => ({
    meta: [
      { title: "LoL Skin Changer for Windows & Mac (Free) — 667 LoL Skin" },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "lol skin changer, league of legends skin changer, lol custom skins, free skin changer, chroma, fantome, LTK",
      },
      { property: "og:title", content: "LoL Skin Changer — 667 LoL Skin" },
      {
        property: "og:description",
        content: "Every skin. Never broken. The free LoL skin changer for Windows and macOS.",
      },
      { property: "og:url", content: PAGE_URL },
      { property: "og:image", content: "https://667.wtf/shots/champions.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "LoL Skin Changer — 667 LoL Skin" },
      { name: "twitter:image", content: "https://667.wtf/shots/champions.jpg" },
    ],
    links: [
      { rel: "canonical", href: PAGE_URL },
      { rel: "alternate", hrefLang: "en", href: PAGE_URL },
      { rel: "alternate", hrefLang: "tr", href: "https://667.wtf/tr/lol-skin-changer" },
      { rel: "alternate", hrefLang: "x-default", href: PAGE_URL },
    ],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(STRUCTURED) }],
  }),
});
