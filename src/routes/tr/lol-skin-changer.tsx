import { createFileRoute } from "@tanstack/react-router";
import { Landing, landingHead, SITE, type LandingContent } from "@/components/skinchanger/Landing";

const PATH = "/tr/lol-skin-changer";

const CONTENT: LandingContent = {
  lang: "tr",
  eyebrow: "League of Legends skin changer",
  h1: "Ücretsiz LoL Skin Changer — Windows ve Mac",
  lead: "667 LoL Skin, League of Legends için ücretsiz bir skin changer. Tüm resmi skinler ve kromalar, 600'den fazla custom skin ve oyun içi 3D önizleme. Windows 10/11 ve Apple Silicon Mac'lerde çalışır, arayüzü Türkçe.",
  prefer: "windows",
  downloadLabel: (p) => `${p} için indir`,
  allReleases: "Tüm sürümler",
  back: "667 LOL SKIN",
  sections: [
    {
      h2: "667 LoL Skin nedir?",
      paragraphs: [
        "667 LoL Skin, League of Legends'ta istediğin skini ve kromayı kullanmanı sağlayan bir skin changer. Skinler sadece senin ekranında görünür; oyun dosyaların değiştirilmez, değişiklikler oyun açıkken ayrı bir katmandan yüklenir.",
        "Açık kaynak LoL mod altyapısı LTK (League Toolkit) üzerine kurulu. Custom Mods sekmesinden kendi modlarını (.fantome, .wad, .zip, .modpkg) kurabilir, Market'ten 600'den fazla custom skini tek tıkla ekleyebilirsin.",
      ],
      bullets: [
        "Tüm resmi skinler ve kromalar",
        "600'den fazla custom skin, HUD ve efekt (Market)",
        "Skinin oyunda nasıl göründüğünü 3D önizle",
        "Canlı maç analizi: 10 oyuncunun rütbesi, şampiyon maçları ve serileri",
        "Windows ve Mac (Apple Silicon)",
      ],
    },
    {
      h2: "Bozuk skin ve güncelleme derdi yok",
      paragraphs: [
        "Her Başlat'ta etkin modların hepsi kontrol edilir. LoL güncellemesiyle uyumsuz hale gelen modlar LTK'nin onarım sistemiyle otomatik düzeltilir; onarılamayan bir mod varsa oyuna girmeden önce söylenir. Custom Mods'taki Sağlık kontrolü düğmesiyle tüm modlarını istediğin zaman kontrol edebilirsin.",
        "Uygulama kendini otomatik günceller. LoL yeni bir yama aldığında yeniden kurulum gerekmez.",
      ],
    },
    {
      h2: "Güvenli mi?",
      paragraphs: [
        "Kötü amaçlı .fantome ve .wad dosyalarıyla bilgisayarlara sızılmaya çalışılıyor. 667 LoL Skin mod dosyalarını asla çalıştırmaz: içerikleri yalnızca oyun verisi (doku, model, ses) olarak okunur. Giriş Discord ile yapılır ve sadece kullanıcı adın ile profil resmin alınır; e-posta, şifre ya da mesajların istenmez.",
      ],
    },
  ],
  stepsTitle: "LoL skin changer nasıl kurulur?",
  steps: [
    {
      title: "İndir",
      body: "Yukarıdaki düğmeden bilgisayarına uygun sürümü (Windows .exe ya da Mac .dmg) indirip kur.",
    },
    {
      title: "Discord ile giriş yap",
      body: "Uygulamayı aç ve bir kez Discord ile giriş yap; sonra hep girişli kalırsın.",
    },
    {
      title: "Skinini seç",
      body: "Şampiyonlar sekmesinden şampiyonu ve skini ya da kromayı seçip Sete ekle. İstersen Market'ten custom skin ekle.",
    },
    {
      title: "Başlat ve oyuna gir",
      body: "Başlat'a bas, sonra LoL istemcisinden oyuna gir. Skinler oyun açılırken yüklenir.",
    },
  ],
  faqTitle: "Sık sorulan sorular",
  faq: [
    { q: "667 LoL Skin ücretsiz mi?", a: "Evet, tamamen ücretsiz. Reklam ve abonelik yok." },
    {
      q: "Skinleri diğer oyuncular görür mü?",
      a: "Hayır. Skinler sadece senin ekranında görünür; diğer oyuncular kendi skinlerini görür.",
    },
    {
      q: "Mac'te çalışıyor mu?",
      a: "Evet. Apple Silicon (M1 ve sonrası) Mac'lerde yerel olarak çalışır; Windows sanal makinesine gerek yoktur.",
    },
    {
      q: "LoL güncellenince ne olur?",
      a: "Uygulama kendini günceller, modlar başlatmadan önce kontrol edilip gerekirse onarılır. Yeniden kurman gerekmez.",
    },
    {
      q: "Hesabım için risk var mı?",
      a: "Skinler sadece senin ekranında görünür, oyun dosyalarına yazılmaz ve hiçbir hile özelliği yoktur. Yine de Riot üçüncü parti araçları resmi olarak desteklemez; kullanım sorumluluğu sana aittir.",
    },
  ],
  related: [
    { href: "/667skinchanger", label: "667 LoL Skin (English)" },
    { href: "/lol-skin-changer-mac", label: "LoL Skin Changer for Mac" },
  ],
};

export const Route = createFileRoute("/tr/lol-skin-changer")({
  component: () => <Landing c={CONTENT} />,
  head: () =>
    landingHead(
      CONTENT,
      PATH,
      "LoL Skin Changer (Ücretsiz) — Windows ve Mac | 667 LoL Skin",
      "Ücretsiz League of Legends skin changer: tüm skinler ve kromalar, 600+ custom skin, 3D önizleme, otomatik onarım ve güncelleme. Windows ve Mac için Türkçe.",
      [
        { lang: "tr", href: `${SITE}${PATH}` },
        { lang: "en", href: `${SITE}/667skinchanger` },
        { lang: "x-default", href: `${SITE}/667skinchanger` },
      ],
    ),
});
