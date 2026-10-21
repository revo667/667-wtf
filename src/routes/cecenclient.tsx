import { createFileRoute, Link } from "@tanstack/react-router";
import { Code, Crown } from "lucide-react";
import { Atmosphere } from "@/components/Atmosphere";
import { RainEffect } from "@/components/RainEffect";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  detectPlatform,
  fetchLatestRelease,
  formatSize,
  type LatestRelease,
  type Platform,
  type ReleaseAsset,
} from "@/lib/github-release";

const REPO = "revo667/cecen-client-releases";
const LANG_KEY = "cecenLang";
const DISCORD = "https://discord.gg/667";

type Lang = "tr" | "en";

const PLATFORMS: Platform[] = ["windows", "mac", "linux"];
const PLATFORM_LABEL: Record<Platform, string> = {
  mac: "macOS",
  windows: "Windows",
  linux: "Linux",
};
const PLATFORM_NOTE: Record<Platform, string> = {
  mac: "Apple Silicon · Intel",
  windows: "Windows 10 / 11",
  linux: "x86_64",
};
const ASSET_NAME: Record<Platform, string> = {
  mac: "CecenClient-macos.dmg",
  windows: "CecenClient-windows.zip",
  linux: "CecenClient-linux.tar.xz",
};

type Shot = { id: string; src: string; label: string; desc: string };
type Pillar = { tag: string; title: string; body: string; points: string[] };
type Feature = { title: string; body: string; image?: string };
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
    noRelease: string;
    version: string;
    showcase: string;
    shots: Shot[];
    stats: [string, string][];
    whyEyebrow: string;
    whyTitle: string;
    pillars: Pillar[];
    socialDemo: { online: string; listening: string; friends: [string, string][] };
    inputsDemo: { offset: string; ahead: string };
    listenDemo: { host: string; you: string; synced: string; song: string };
    featuresEyebrow: string;
    featuresTitle: string;
    features: Feature[];
    faqTitle: string;
    faq: Faq[];
    ctaTitle: string;
    ctaBody: string;
    discord: string;
  }
> = {
  en: {
    back: "HOME",
    eyebrow: "DDNet client",
    title: "Cecen Client for most Tryhard DDNet players",
    lead: "The fastest inputs in DDNet, the first social profiles and friends, and Spotify listen along, on top of everything DDNet already does.",
    trust: ["Free", "macOS · Windows · Linux", "Updates itself", "Keeps your DDNet settings"],
    downloadFor: (p) => `Download for ${p}`,
    download: "Download",
    allReleases: "All releases",
    loading: "Fetching the latest release…",
    noRelease: "Download from GitHub",
    version: "Version",
    showcase: "Inside",
    shots: [
      {
        id: "menu",
        src: "/cecen/menu.jpg",
        label: "Menu",
        desc: "A quiet start menu that gets you into a game in one click.",
      },
      {
        id: "inputs",
        src: "/cecen/inputs.jpg",
        label: "Inputs",
        desc: "667, Fast, Saiko, Cloud and Meow input prediction with a tunable offset.",
      },
      {
        id: "settings",
        src: "/cecen/settings.jpg",
        label: "Cecen UI",
        desc: "Every setting grouped into categories, with search.",
      },
    ],
    stats: [
      ["5", "input modes"],
      ["1st", "social profiles in DDNet"],
      ["Live", "Spotify listen along"],
      ["3", "platforms"],
    ],
    whyEyebrow: "Why Cecen",
    whyTitle: "Built for players who take every frame seriously.",
    pillars: [
      {
        tag: "Cecen Social",
        title: "The first social profiles and friends in DDNet",
        body: "Every Cecen Client player has a profile: picture, bio, connections and badges, shown on the scoreboard card and in Cecen Social.",
        points: [
          "See which friends are online, where they play and what they listen to",
          "Link Discord, GitHub, Steam, X and more",
          "Search finds styled names too: “noval” finds Nᴏᴠᴀʟ",
          "Private profile with one switch",
        ],
      },
      {
        tag: "Inputs",
        title: "Best Fast Inputs in DDNet",
        body: "Your tee reacts before the server answers. Pick the prediction that fits your hand and tune how far ahead it plays.",
        points: [
          "667, Fast, Saiko, Cloud and Meow modes",
          "Prediction offset in ticks, Auto Margin",
          "Input Debounce and Sub-Tick aiming",
          "Snap Tap for instant left/right switching",
        ],
      },
      {
        tag: "Spotify",
        title: "Listen along with your friends",
        body: "Join a friend's song and hear the same moment they do. Cecen Client keeps you in sync through Spotify Connect while you play.",
        points: [
          "Follows the song, skips and seeks of the friend you join",
          "The game keeps focus, no alt-tab",
          "Music HUD with visualizer and synced lyrics",
          "Shows what you play on Discord",
        ],
      },
    ],
    socialDemo: {
      online: "Online · KoG",
      listening: "Listening along",
      friends: [
        ["rain cakir", "Black_Widow"],
        ["Nᴏᴠᴀʟ", "Micksee"],
      ],
    },
    inputsDemo: { offset: "Prediction offset", ahead: "ahead of the server" },
    listenDemo: { host: "revo667", you: "you", synced: "in sync", song: "Now playing" },
    featuresEyebrow: "Everything else",
    featuresTitle: "Everything DDNet does, and a lot more.",
    features: [
      {
        title: "Cecen UI",
        body: "A settings hub with categories and search, themed checkboxes, sliders and colors, and a HUD editor to drag, drop and resize every module.",
        image: "/cecen/settings.jpg",
      },
      {
        title: "Music player",
        body: "A HUD player for Spotify and your system media, with a visualizer and synced lyrics.",
      },
      {
        title: "Chat media",
        body: "Photos and GIFs from chat links render inline, with a domain filter.",
      },
      {
        title: "Visual effects",
        body: "Weather, weapon glow, hook effects, 3D particles and animated menus.",
      },
      {
        title: "Race tools",
        body: "Finish prediction, a local practice world and quick command slots.",
      },
      {
        title: "Optimizer",
        body: "Turn off particles and quads, add FPS fog, and keep frame times flat.",
      },
      {
        title: "Discord Rich Presence",
        body: "Your server, map and song on your Discord profile.",
      },
      {
        title: "Keystrokes",
        body: "A Classic or Minecraft style keyboard and mouse overlay for your clips.",
      },
      {
        title: "Mini games",
        body: "Snake, Chess, Sudoku, Minesweeper and more for the waiting room.",
      },
    ],
    faqTitle: "FAQ",
    faq: [
      { q: "Is it free?", a: "Yes, completely free." },
      {
        q: "Does it lag?",
        a: "With beta reports on, and within what DDNet allows, the stutters, freezes and jitter you get in game are reported to us, and problems on the client side are fixed fast. You can turn reports off in Cecen Client > Others > Beta.",
      },
      {
        q: "Will I lose my DDNet settings?",
        a: "No. Cecen Client uses the same DDNet folder, so your settings, binds, skins and friends stay.",
      },
      {
        q: "Do I need Spotify Premium for listen along?",
        a: "Yes, Spotify only lets Premium accounts control playback through Spotify Connect. The music HUD and lyrics work without it.",
      },
      {
        q: "Who can see my profile?",
        a: "Cecen Client players see it on the scoreboard and in Cecen Social. Make it private and they only see your name and picture.",
      },
      {
        q: "Which systems does it run on?",
        a: "macOS 11 or later (Apple Silicon and Intel), Windows 10 and 11 (64-bit), and Linux x86_64.",
      },
      { q: "Does it update itself?", a: "Yes, new versions download and install on start." },
    ],
    ctaTitle: "Ready to play?",
    ctaBody: "Download Cecen Client and join 667 on Discord.",
    discord: "Join the Discord",
  },
  tr: {
    back: "ANA SAYFA",
    eyebrow: "DDNet client",
    title: "Cecen Client for most Tryhard DDNet players",
    lead: "DDNet'in en hızlı input'ları, ilk sosyal profiller ve arkadaşlar, Spotify ile birlikte dinleme; DDNet'in yaptığı her şeyin üstüne.",
    trust: ["Ücretsiz", "macOS · Windows · Linux", "Kendini günceller", "DDNet ayarların korunur"],
    downloadFor: (p) => `${p} için indir`,
    download: "İndir",
    allReleases: "Tüm sürümler",
    loading: "Son sürüm alınıyor…",
    noRelease: "GitHub'dan indir",
    version: "Sürüm",
    showcase: "İçeride",
    shots: [
      {
        id: "menu",
        src: "/cecen/menu.jpg",
        label: "Menü",
        desc: "Tek tıkla oyuna sokan sade bir başlangıç menüsü.",
      },
      {
        id: "inputs",
        src: "/cecen/inputs.jpg",
        label: "Input'lar",
        desc: "667, Fast, Saiko, Cloud ve Meow input tahmini, ayarlanabilir ofsetle.",
      },
      {
        id: "settings",
        src: "/cecen/settings.jpg",
        label: "Cecen UI",
        desc: "Tüm ayarlar kategorilere ayrılmış, aramayla.",
      },
    ],
    stats: [
      ["5", "input modu"],
      ["İlk", "DDNet'te sosyal profil"],
      ["Canlı", "Spotify listen along"],
      ["3", "platform"],
    ],
    whyEyebrow: "Neden Cecen",
    whyTitle: "Her kareyi ciddiye alan oyuncular için.",
    pillars: [
      {
        tag: "Cecen Social",
        title: "DDNet'te ilk sosyal profil ve arkadaş özellikleri",
        body: "Her Cecen Client oyuncusunun bir profili var: resim, bio, bağlantılar ve rozetler; skor tablosu kartında ve Cecen Social'da görünür.",
        points: [
          "Hangi arkadaşın çevrimiçi, nerede oynuyor, ne dinliyor gör",
          "Discord, GitHub, Steam, X ve daha fazlasını bağla",
          "Arama süslü isimleri de bulur: “noval” Nᴏᴠᴀʟ'ı bulur",
          "Tek tuşla gizli profil",
        ],
      },
      {
        tag: "Input'lar",
        title: "DDNet'teki en iyi Fast Input'lar",
        body: "Tee'n sunucu cevap vermeden tepki verir. Eline uyan tahmini seç, ne kadar ileride oynayacağını ayarla.",
        points: [
          "667, Fast, Saiko, Cloud ve Meow modları",
          "Tick cinsinden tahmin ofseti, Auto Margin",
          "Input Debounce ve Sub-Tick aiming",
          "Anında sağ/sol geçişi için Snap Tap",
        ],
      },
      {
        tag: "Spotify",
        title: "Arkadaşlarınla birlikte dinle",
        body: "Bir arkadaşının şarkısına katıl, aynı anı birlikte duyun. Cecen Client oynarken Spotify Connect üzerinden senkron tutar.",
        points: [
          "Katıldığın arkadaşın şarkısını, geçişlerini ve sarmalarını takip eder",
          "Oyun odakta kalır, alt-tab yok",
          "Visualizer ve senkron sözlerle müzik HUD'u",
          "Ne oynadığını Discord'da gösterir",
        ],
      },
    ],
    socialDemo: {
      online: "Çevrimiçi · KoG",
      listening: "Birlikte dinliyor",
      friends: [
        ["rain cakir", "Black_Widow"],
        ["Nᴏᴠᴀʟ", "Micksee"],
      ],
    },
    inputsDemo: { offset: "Tahmin ofseti", ahead: "sunucudan önde" },
    listenDemo: { host: "revo667", you: "sen", synced: "senkron", song: "Şimdi çalıyor" },
    featuresEyebrow: "Dahası",
    featuresTitle: "DDNet'in yaptığı her şey, ve çok daha fazlası.",
    features: [
      {
        title: "Cecen UI",
        body: "Kategoriler ve aramayla ayar merkezi; temalı kutucuklar, kaydırıcılar ve renkler; her modülü sürükleyip boyutlandırabildiğin HUD editörü.",
        image: "/cecen/settings.jpg",
      },
      {
        title: "Müzik çalar",
        body: "Spotify ve sistem medyası için HUD çalar; visualizer ve senkron sözlerle.",
      },
      {
        title: "Chat medya",
        body: "Sohbetteki fotoğraf ve GIF linkleri yerinde açılır, alan adı filtresiyle.",
      },
      {
        title: "Görsel efektler",
        body: "Hava durumu, silah parlaması, hook efektleri, 3D parçacıklar ve animasyonlu menüler.",
      },
      {
        title: "Race araçları",
        body: "Bitiş tahmini, yerel pratik dünyası ve hızlı komut slotları.",
      },
      {
        title: "Optimizer",
        body: "Parçacıkları ve quad'ları kapat, FPS sisi ekle, kare sürelerini düz tut.",
      },
      {
        title: "Discord Rich Presence",
        body: "Sunucun, haritan ve şarkın Discord profilinde.",
      },
      {
        title: "Keystrokes",
        body: "Kliplerin için Classic ya da Minecraft tarzı klavye ve mouse göstergesi.",
      },
      {
        title: "Mini oyunlar",
        body: "Bekleme odası için Snake, Satranç, Sudoku, Mayın Tarlası ve dahası.",
      },
    ],
    faqTitle: "SSS",
    faq: [
      { q: "Ücretsiz mi?", a: "Evet, tamamen ücretsiz." },
      {
        q: "Lag yapıyor mu?",
        a: "Beta raporları açıksa, DDNet'in izin verdiği süreçler dahilinde oyundaki lagların, donmaların ve jitter'ların bize bildirilir; client tarafındaki sorunlar hızla çözülür. Raporları Cecen Client > Others > Beta'dan kapatabilirsin.",
      },
      {
        q: "DDNet ayarlarımı kaybeder miyim?",
        a: "Hayır. Cecen Client aynı DDNet klasörünü kullanır; ayarların, bind'ların, skin'lerin ve arkadaşların yerinde kalır.",
      },
      {
        q: "Listen along için Spotify Premium gerekir mi?",
        a: "Evet, Spotify Connect ile çalmayı yalnızca Premium hesaplar kontrol edebiliyor. Müzik HUD'u ve sözler Premium olmadan da çalışır.",
      },
      {
        q: "Profilimi kimler görür?",
        a: "Cecen Client oyuncuları skor tablosunda ve Cecen Social'da görür. Gizli yaparsan sadece adını ve resmini görürler.",
      },
      {
        q: "Hangi sistemlerde çalışır?",
        a: "macOS 11 ve sonrası (Apple Silicon ve Intel), Windows 10 ve 11 (64-bit) ve Linux x86_64.",
      },
      { q: "Kendini günceller mi?", a: "Evet, yeni sürümler açılışta inip kurulur." },
    ],
    ctaTitle: "Oynamaya hazır mısın?",
    ctaBody: "Cecen Client'ı indir ve Discord'da 667'ye katıl.",
    discord: "Discord'a katıl",
  },
};

type T = (typeof COPY)[Lang];

function pickCecenAsset(assets: ReleaseAsset[], platform: Platform): ReleaseAsset | null {
  return assets.find((a) => a.name === ASSET_NAME[platform]) ?? null;
}

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

function useReveal<E extends HTMLElement>() {
  const ref = useRef<E>(null);
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
  return (
    <div
      data-spotlight
      className={`spotlight-card group overflow-hidden rounded-xl border border-white/10 bg-neutral-950/90 transition-colors duration-300 hover:border-white/20 ${className}`}
    >
      <div className="relative h-full">{children}</div>
    </div>
  );
}

function CecenClient() {
  const [lang, setLang] = useState<Lang>("en");
  const [platform, setPlatform] = useState<Platform | null>(null);
  const { release, state } = useRelease();
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

  const pickLang = (next: Lang) => {
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white/80 selection:bg-violet-500/30">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_50%_0%,black_30%,transparent_75%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[720px] [background:radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(139,92,246,0.22),transparent_70%)]"
      />
      <Atmosphere />
      <RainEffect lit />

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
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
            <img src="/cecen/logo.png" alt="" className="size-6 rounded" />
            <span className="text-[13px] font-medium text-white">Cecen Client</span>
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
        <section className="mx-auto max-w-6xl px-4 pt-20 text-center sm:px-6 sm:pt-28">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] text-white/60">
              <span className="size-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_2px_rgba(139,92,246,0.7)]" />
              {release?.version ? `${release.version.replace(/^v?/i, "v")} · ` : ""}
              {t.eyebrow}
            </span>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="mx-auto mt-6 max-w-5xl bg-gradient-to-b from-white to-white/65 bg-clip-text font-[family-name:var(--font-jetbrains)] text-[1.75rem] leading-[1.15] font-extrabold tracking-[-0.04em] text-transparent sm:text-6xl">
              <span className="bg-gradient-to-b from-violet-200 to-violet-500 bg-clip-text text-transparent">
                Cecen Client
              </span>
              {(t.title.split("Tryhard")[0] ?? "").replace("Cecen Client", "")}
              <span className="bg-gradient-to-b from-violet-200 to-violet-500 bg-clip-text text-transparent">
                Tryhard
              </span>
              {t.title.split("Tryhard")[1]}
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/55 sm:text-lg">
              {t.lead}
            </p>
          </Reveal>
          <Reveal delay={240}>
            <Download t={t} release={release} state={state} platform={platform} />
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

        <section className="mx-auto mt-16 max-w-6xl px-4 sm:mt-20 sm:px-6">
          <Reveal>
            <Showcase shots={t.shots} label={t.showcase} />
          </Reveal>
          <Reveal>
            <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 sm:grid-cols-4">
              {t.stats.map(([n, l]) => (
                <div key={l} className="bg-black px-4 py-5 text-center sm:px-6">
                  <div className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-white">
                    {n}
                  </div>
                  <div className="mt-1 text-[13px] text-white/45">{l}</div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
          <SectionHead eyebrow={t.whyEyebrow} title={t.whyTitle} />
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {t.pillars.map((p, i) => (
              <Reveal key={p.tag} delay={i * 90}>
                <Spotlight className="h-full">
                  <div className="flex h-full flex-col p-6">
                    <div className="mb-6 h-44 overflow-hidden rounded-lg border border-white/[0.08] bg-white/[0.02]">
                      {i === 0 ? (
                        <SocialDemo t={t.socialDemo} />
                      ) : i === 1 ? (
                        <InputsDemo t={t.inputsDemo} />
                      ) : (
                        <ListenDemo t={t.listenDemo} />
                      )}
                    </div>
                    <span className="font-mono text-[11px] tracking-widest text-violet-300/80 uppercase">
                      {p.tag}
                    </span>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                      {p.title}
                    </h2>
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

        <section className="mx-auto mt-32 max-w-6xl px-4 sm:px-6">
          <SectionHead eyebrow={t.featuresEyebrow} title={t.featuresTitle} />
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {t.features.map((f, i) => (
              <Reveal
                key={f.title}
                delay={(i % 3) * 80}
                className={f.image ? "md:col-span-2 md:row-span-2" : ""}
              >
                <Spotlight className="h-full">
                  <div className="p-6">
                    {f.image && (
                      <div className="mb-5 overflow-hidden rounded-lg border border-white/[0.08]">
                        <img
                          src={f.image}
                          alt=""
                          loading="lazy"
                          className="aspect-[1600/814] w-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-[1.02]"
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

        <section className="mx-auto mt-32 max-w-3xl px-4 sm:px-6">
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

        <section className="mx-auto mt-32 max-w-6xl px-4 pb-24 sm:px-6">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 px-6 py-16 text-center">
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 [background:radial-gradient(ellipse_50%_80%_at_50%_100%,rgba(139,92,246,0.18),transparent_70%)]"
              />
              <div className="relative">
                <img src="/cecen/logo.png" alt="" className="mx-auto size-14 rounded-xl" />
                <h2 className="mt-6 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight text-white">
                  {t.ctaTitle}
                </h2>
                <p className="mt-3 text-[15px] text-white/55">{t.ctaBody}</p>
                <Download t={t} release={release} state={state} platform={platform} compact />
                <a
                  href={DISCORD}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-5 inline-flex items-center gap-2 text-[13px] text-white/50 transition-colors hover:text-white"
                >
                  {t.discord} <span aria-hidden>↗</span>
                </a>
              </div>
            </div>
          </Reveal>
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

function Download({
  t,
  release,
  state,
  platform,
  compact,
}: {
  t: T;
  release: LatestRelease | null;
  state: "loading" | "ready" | "empty";
  platform: Platform | null;
  compact?: boolean;
}) {
  const primary = useMemo(
    () => (release && platform ? pickCecenAsset(release.assets, platform) : null),
    [release, platform],
  );
  const others = useMemo(
    () =>
      release
        ? PLATFORMS.filter((p) => p !== platform)
            .map((p) => ({ platform: p, asset: pickCecenAsset(release.assets, p) }))
            .filter((x) => x.asset)
        : [],
    [release, platform],
  );
  const releasesUrl = release?.pageUrl ?? `https://github.com/${REPO}/releases/latest`;

  if (state === "loading") return <p className="mt-10 text-[13px] text-white/40">{t.loading}</p>;
  if (state === "empty" || !release)
    return (
      <div className="mt-10">
        <a
          href={releasesUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-medium text-black transition hover:bg-white/90"
        >
          {t.noRelease} <span aria-hidden>↗</span>
        </a>
      </div>
    );

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        {primary && platform ? (
          <a
            href={primary.url}
            className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-white px-7 text-[15px] font-medium text-black shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_8px_40px_rgba(139,92,246,0.35)] transition hover:bg-white/90"
          >
            <span aria-hidden className="transition-transform group-hover:translate-y-0.5">
              ↓
            </span>
            {t.downloadFor(PLATFORM_LABEL[platform])}
          </a>
        ) : (
          <a
            href={releasesUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-medium text-black transition hover:bg-white/90"
          >
            {t.download} <span aria-hidden>↗</span>
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
        {primary && platform && <span>{PLATFORM_NOTE[platform]}</span>}
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
        <div className="relative aspect-[1600/814] overflow-hidden rounded-xl bg-black">
          {shots.map((s, i) => (
            <img
              key={s.id}
              src={s.src}
              alt={s.label}
              width={1600}
              height={814}
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

function useStep(count: number, ms: number) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % count), ms);
    return () => clearInterval(id);
  }, [count, ms]);
  return step;
}

function SocialDemo({ t }: { t: T["socialDemo"] }) {
  const step = useStep(2, 1800);
  return (
    <div className="flex h-full flex-col justify-center gap-2.5 px-4">
      <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
        <div className="h-6 bg-gradient-to-r from-violet-600/80 to-violet-400/60" />
        <div className="flex items-center gap-3 px-3 pb-2.5">
          <div className="-mt-3 size-10 shrink-0 rounded-full border-[3px] border-black bg-gradient-to-br from-violet-400/60 to-white/10" />
          <div className="min-w-0 pt-1">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-white">
              revo667
              <Crown className="size-3.5 fill-violet-300 text-violet-300" />
              <span className="grid h-3.5 w-[18px] place-items-center rounded-[4px] bg-violet-500">
                <Code className="size-2.5 text-white" strokeWidth={3} />
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/50">
              <span className="size-1.5 rounded-full bg-emerald-400" />
              {t.online}
            </div>
          </div>
        </div>
      </div>
      {t.friends.map(([name, map], i) => (
        <div
          key={name}
          className="flex items-center justify-between rounded-md border border-white/[0.06] bg-black px-3 py-1.5 text-[11px]"
        >
          <span className="flex items-center gap-2 text-white/80">
            <span
              className={`size-1.5 rounded-full transition-colors duration-500 ${
                i === step ? "bg-emerald-400" : "bg-white/20"
              }`}
            />
            {name}
          </span>
          <span
            className={`font-mono transition-colors duration-500 ${i === step ? "text-violet-300" : "text-white/25"}`}
          >
            {i === step ? (i === 0 ? map : t.listening) : "·"}
          </span>
        </div>
      ))}
    </div>
  );
}

const INPUT_MODES = ["667", "Fast", "Saiko", "Cloud", "Meow"];

function InputsDemo({ t }: { t: T["inputsDemo"] }) {
  const step = useStep(INPUT_MODES.length, 1400);
  const ticks = [1.5, 1.0, 1.25, 1.75, 1.5][step]!;
  return (
    <div className="flex h-full flex-col justify-center gap-4 px-4">
      <div className="grid grid-cols-5 overflow-hidden rounded-md border border-white/10 bg-black font-mono text-[10px]">
        {INPUT_MODES.map((m, i) => (
          <span
            key={m}
            className={`py-1.5 text-center transition-colors duration-500 ${
              i === step ? "bg-violet-500 text-white" : "text-white/40"
            }`}
          >
            {m}
          </span>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between font-mono text-[10px] text-white/45">
          <span>{t.offset}</span>
          <span className="text-white/80">{ticks.toFixed(2)} ticks</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-violet-400 transition-all duration-700 ease-out"
            style={{ width: `${(ticks / 2) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex items-baseline justify-center gap-2">
        <span className="font-[family-name:var(--font-display)] text-3xl font-semibold text-white">
          −{Math.round(ticks * 20)} ms
        </span>
        <span className="text-[11px] text-white/40">{t.ahead}</span>
      </div>
    </div>
  );
}

function ListenDemo({ t }: { t: T["listenDemo"] }) {
  const [progress, setProgress] = useState(18);
  useEffect(() => {
    const id = setInterval(() => setProgress((p) => (p >= 92 ? 12 : p + 1.2)), 120);
    return () => clearInterval(id);
  }, []);
  const rows: [string, number][] = [
    [t.host, progress],
    [t.you, Math.max(0, progress - 0.4)],
  ];
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-md bg-gradient-to-br from-emerald-500/70 to-violet-500/60 text-[16px] text-white">
          ♫
        </div>
        <div className="min-w-0">
          <div className="text-[10px] tracking-widest text-white/40 uppercase">{t.song}</div>
          <div className="truncate text-[13px] font-medium text-white">Cecen · 667 Mix</div>
        </div>
      </div>
      {rows.map(([name, value]) => (
        <div key={name} className="flex items-center gap-3 font-mono text-[10px]">
          <span className="w-14 shrink-0 truncate text-white/60">{name}</span>
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-emerald-400" style={{ width: `${value}%` }} />
          </div>
        </div>
      ))}
      <div className="flex items-center justify-center gap-1.5 font-mono text-[10px] text-emerald-400">
        <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
        {t.synced} ±0.1 s
      </div>
    </div>
  );
}

const PAGE_URL = "https://667.wtf/cecenclient";
const SEO_TITLE = "Cecen Client — DDNet Client";
const DESCRIPTION =
  "Cecen Client is a free DDNet client for macOS, Windows and Linux: the best fast inputs in DDNet, the first DDNet social profiles and friends (Cecen Social), and Spotify listen along.";

const STRUCTURED = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Cecen Client",
    alternateName: ["Cecen DDNet Client", "Cecen", "667 Client", "DDNet Client"],
    description: DESCRIPTION,
    url: PAGE_URL,
    applicationCategory: "GameApplication",
    applicationSubCategory: "DDNet client",
    operatingSystem: "Windows 10, Windows 11, macOS, Linux",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    image: "https://667.wtf/cecen/menu.jpg",
    screenshot: [
      "https://667.wtf/cecen/menu.jpg",
      "https://667.wtf/cecen/inputs.jpg",
      "https://667.wtf/cecen/settings.jpg",
    ],
    downloadUrl: `https://github.com/${REPO}/releases/latest`,
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

export const Route = createFileRoute("/cecenclient")({
  component: CecenClient,
  head: () => ({
    meta: [
      { title: SEO_TITLE },
      { name: "description", content: DESCRIPTION },
      {
        name: "keywords",
        content:
          "ddnet client, cecen client, cecen ddnet, best ddnet client, ddnet fast input, ddnet input prediction, ddnet mac client, ddnet windows client, teeworlds client, ddnet spotify, ddnet friends, ddnet profiles, kog client",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "667" },
      { property: "og:title", content: SEO_TITLE },
      {
        property: "og:description",
        content:
          "Best Fast Inputs in DDNet, Cecen Social profiles and friends, Spotify listen along.",
      },
      { property: "og:url", content: PAGE_URL },
      { property: "og:image", content: "https://667.wtf/cecen/menu.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: SEO_TITLE },
      { name: "twitter:image", content: "https://667.wtf/cecen/menu.jpg" },
    ],
    links: [{ rel: "canonical", href: PAGE_URL }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(STRUCTURED) }],
  }),
});
