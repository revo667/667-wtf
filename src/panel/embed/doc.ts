/** Embed sekmesinin tasarım modeli. Backend'deki `embeds::Doc` ile birebir aynı. */

export type Mode = "embed" | "blocks";
/** Blok düzeninde görselin yazıya göre yeri. Discord görseli yazının soluna koymaz. */
export type ImagePos = "right" | "top" | "bottom";

export interface Field {
  name: string;
  value: string;
  inline: boolean;
}

export interface Embed {
  color: number | null;
  author_name: string;
  author_url: string;
  author_icon: string;
  title: string;
  url: string;
  description: string;
  fields: Field[];
  /** Sağ üstteki küçük görsel */
  thumbnail: string;
  /** Alttaki büyük görsel */
  image: string;
  footer_text: string;
  footer_icon: string;
  /** "" yok, "now" gönderildiği an, yoksa ISO 8601 */
  timestamp: string;
}

export interface Media {
  url: string;
  description: string;
  spoiler: boolean;
}

export interface LinkButton {
  label: string;
  url: string;
  emoji: string;
}

export type Block =
  | { kind: "text"; text: string; image: Media | null; image_pos: ImagePos }
  | { kind: "gallery"; items: Media[] }
  | { kind: "separator"; divider: boolean; large: boolean }
  | { kind: "buttons"; buttons: LinkButton[] };

export interface Doc {
  mode: Mode;
  /** Klasik: embed'lerin üstündeki düz metin */
  content: string;
  embeds: Embed[];
  /** Klasik: mesajın altındaki bağlantı butonları */
  buttons: LinkButton[];
  /** Blok düzeni: bloklar renkli bir çerçevenin içinde mi */
  container: boolean;
  accent: number | null;
  blocks: Block[];
}

export const DEFAULT_COLOR = 0x8e64d7;

// Discord sınırları (backend aynılarını uygular; burada sayaçlar için)
export const LIMITS = {
  content: 2000,
  embeds: 10,
  embedTotal: 6000,
  title: 256,
  description: 4096,
  fields: 25,
  fieldName: 256,
  fieldValue: 1024,
  footer: 2048,
  author: 256,
  buttons: 25,
  buttonLabel: 80,
  blockText: 4000,
  components: 40,
  gallery: 10,
  mediaDescription: 1024,
} as const;

export const newEmbed = (): Embed => ({
  color: DEFAULT_COLOR,
  author_name: "",
  author_url: "",
  author_icon: "",
  title: "",
  url: "",
  description: "",
  fields: [],
  thumbnail: "",
  image: "",
  footer_text: "",
  footer_icon: "",
  timestamp: "",
});

export const newMedia = (url = ""): Media => ({ url, description: "", spoiler: false });
export const newButton = (): LinkButton => ({ label: "", url: "", emoji: "" });

export function newBlock(kind: Block["kind"]): Block {
  switch (kind) {
    case "text":
      return { kind, text: "", image: null, image_pos: "right" };
    case "gallery":
      return { kind, items: [newMedia()] };
    case "separator":
      return { kind, divider: true, large: false };
    case "buttons":
      return { kind, buttons: [newButton()] };
  }
}

export const emptyDoc = (): Doc => ({
  mode: "embed",
  content: "",
  embeds: [newEmbed()],
  buttons: [],
  container: true,
  accent: DEFAULT_COLOR,
  blocks: [newBlock("text")],
});

/** Backend'den gelen (eksik alanlı olabilecek) tasarımı editörün beklediği hale getirir. */
export function normalize(raw: Partial<Doc> | null | undefined): Doc {
  const base = emptyDoc();
  if (!raw) return base;
  return {
    mode: raw.mode === "blocks" ? "blocks" : "embed",
    content: raw.content ?? "",
    embeds: raw.embeds?.length
      ? raw.embeds.map((e) => ({ ...newEmbed(), ...e, fields: e.fields ?? [] }))
      : base.embeds,
    buttons: raw.buttons ?? [],
    container: raw.container ?? base.container,
    accent: raw.accent ?? null,
    blocks: raw.blocks?.length ? raw.blocks : base.blocks,
  };
}

/** Anahtar sırasından bağımsız derin eşitlik (kaydedilmemiş değişiklik var mı). */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const keys = Object.keys(ra);
  return keys.length === Object.keys(rb).length && keys.every((k) => deepEqual(ra[k], rb[k]));
}

/** Değişkenleri (ya da başka bir dönüşümü) tasarımdaki tüm yazılara uygular. */
export function mapStrings(doc: Doc, fn: (s: string) => string): Doc {
  return JSON.parse(JSON.stringify(doc), (_k, v: unknown) =>
    typeof v === "string" ? fn(v) : v,
  ) as Doc;
}

export const hex = (n: number | null) =>
  n === null ? "" : `#${(n & 0xffffff).toString(16).padStart(6, "0")}`;

export function fromHex(s: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(s.trim());
  return m ? parseInt(m[1] ?? "0", 16) : null;
}

/** Karakter sayısı; Discord (ve backend) emojileri tek karakter sayar. */
export const chars = (s: string) => [...s.trim()].length;

/** Discord mesaj bağlantısı ya da "kanalID-mesajID" → kanal ve mesaj ID'si. */
export function parseMessageLink(raw: string): { channel: string; message: string } | null {
  const s = raw.trim();
  const link = /discord(?:app)?\.com\/channels\/(?:\d+|@me)\/(\d{15,21})\/(\d{15,21})/.exec(s);
  const pair = link ?? /^(\d{15,21})[-/ ](\d{15,21})$/.exec(s);
  if (!pair?.[1] || !pair[2]) return null;
  return { channel: pair[1], message: pair[2] };
}

/** Embed'in Discord'un 6000 karakterlik toplamına giren yazıları. */
export function embedChars(e: Embed): number {
  return (
    chars(e.author_name) +
    chars(e.title) +
    chars(e.description) +
    chars(e.footer_text) +
    e.fields.reduce((n, f) => n + chars(f.name) + chars(f.value), 0)
  );
}

const filledButtons = (bs: LinkButton[]) => bs.filter((b) => b.url.trim()).length;

/** Blok düzeninin bileşen sayısı (en fazla 40) ve yazı toplamı (en fazla 4000); backend'le aynı sayım. */
export function blockStats(doc: Doc): { components: number; text: number } {
  let components = doc.container ? 1 : 0;
  let text = 0;
  for (const b of doc.blocks) {
    if (b.kind === "text") {
      const hasText = b.text.trim() !== "";
      const hasImage = !!b.image?.url.trim();
      text += chars(b.text);
      if (hasText && hasImage) components += b.image_pos === "right" ? 3 : 2;
      else if (hasText || hasImage) components += 1;
    } else if (b.kind === "gallery") {
      if (b.items.some((m) => m.url.trim())) components += 1;
    } else if (b.kind === "separator") {
      components += 1;
    } else {
      const n = filledButtons(b.buttons);
      components += n + Math.ceil(n / 5);
    }
  }
  return { components, text };
}

/** Karşılama/ayrılma mesajında kullanılabilen değişkenler. */
export const GREETING_VARS: { key: string; label: string }[] = [
  { key: "{user}", label: "üyeyi etiketler" },
  { key: "{name}", label: "üyenin adı" },
  { key: "{server}", label: "sunucu adı" },
  { key: "{count}", label: "üye sayısı" },
  { key: "{avatar}", label: "üyenin avatarı (görsel alanlarına)" },
  { key: "{server_icon}", label: "sunucu ikonu (görsel alanlarına)" },
];

/** Önizlemede değişkenlerin örnek değerleri. `<@0>` önizlemede "@yeni-üye" görünür. */
export function sampleFill(s: string): string {
  return s
    .replaceAll("{user}", "<@0>")
    .replaceAll("{name}", "yeni üye")
    .replaceAll("{server}", "667")
    .replaceAll("{count}", "1.375")
    .replaceAll("{avatar}", "https://cdn.discordapp.com/embed/avatars/0.png")
    .replaceAll("{server_icon}", "https://cdn.discordapp.com/embed/avatars/1.png");
}
