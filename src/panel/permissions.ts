// Discord yetki bitleri (Türkçe adlarla). Maskeler 53 biti aşabildiği için BigInt kullanılır.
// Hangi yetkilerin yasaklı olduğu backend'den (forbidden_mask) gelir, burada sabitlenmez.

export type PermGroup = "Genel" | "Metin" | "Ses" | "Yönetim";

export interface PermDef {
  bit: number;
  key: string;
  label: string;
  group: PermGroup;
}

export const GROUPS: PermGroup[] = ["Genel", "Metin", "Ses", "Yönetim"];

export const PERMISSIONS: PermDef[] = [
  { bit: 10, key: "VIEW_CHANNEL", label: "Kanalları görüntüle", group: "Genel" },
  { bit: 0, key: "CREATE_INSTANT_INVITE", label: "Davet oluştur", group: "Genel" },
  { bit: 26, key: "CHANGE_NICKNAME", label: "Takma ad değiştir", group: "Genel" },
  { bit: 43, key: "CREATE_GUILD_EXPRESSIONS", label: "İfade oluştur", group: "Genel" },
  { bit: 44, key: "CREATE_EVENTS", label: "Etkinlik oluştur", group: "Genel" },

  { bit: 11, key: "SEND_MESSAGES", label: "Mesaj gönder", group: "Metin" },
  {
    bit: 38,
    key: "SEND_MESSAGES_IN_THREADS",
    label: "Alt başlıklarda mesaj gönder",
    group: "Metin",
  },
  {
    bit: 35,
    key: "CREATE_PUBLIC_THREADS",
    label: "Herkese açık alt başlık oluştur",
    group: "Metin",
  },
  { bit: 36, key: "CREATE_PRIVATE_THREADS", label: "Özel alt başlık oluştur", group: "Metin" },
  { bit: 14, key: "EMBED_LINKS", label: "Bağlantı önizlemesi", group: "Metin" },
  { bit: 15, key: "ATTACH_FILES", label: "Dosya ekle", group: "Metin" },
  { bit: 6, key: "ADD_REACTIONS", label: "Tepki ekle", group: "Metin" },
  { bit: 18, key: "USE_EXTERNAL_EMOJIS", label: "Harici emoji", group: "Metin" },
  { bit: 37, key: "USE_EXTERNAL_STICKERS", label: "Harici çıkartma", group: "Metin" },
  { bit: 16, key: "READ_MESSAGE_HISTORY", label: "Mesaj geçmişini oku", group: "Metin" },
  { bit: 12, key: "SEND_TTS_MESSAGES", label: "Sesli okunan (TTS) mesaj", group: "Metin" },
  { bit: 46, key: "SEND_VOICE_MESSAGES", label: "Sesli mesaj gönder", group: "Metin" },
  { bit: 49, key: "SEND_POLLS", label: "Anket oluştur", group: "Metin" },
  { bit: 31, key: "USE_APPLICATION_COMMANDS", label: "Uygulama komutları", group: "Metin" },
  { bit: 50, key: "USE_EXTERNAL_APPS", label: "Harici uygulamalar", group: "Metin" },
  { bit: 13, key: "MANAGE_MESSAGES", label: "Mesajları yönet", group: "Metin" },
  { bit: 34, key: "MANAGE_THREADS", label: "Alt başlıkları yönet", group: "Metin" },
  { bit: 17, key: "MENTION_EVERYONE", label: "@everyone / @here etiketle", group: "Metin" },

  { bit: 20, key: "CONNECT", label: "Bağlan", group: "Ses" },
  { bit: 21, key: "SPEAK", label: "Konuş", group: "Ses" },
  { bit: 9, key: "STREAM", label: "Yayın / kamera", group: "Ses" },
  { bit: 25, key: "USE_VAD", label: "Ses etkinliği", group: "Ses" },
  { bit: 8, key: "PRIORITY_SPEAKER", label: "Öncelikli konuşmacı", group: "Ses" },
  { bit: 39, key: "USE_EMBEDDED_ACTIVITIES", label: "Aktiviteler", group: "Ses" },
  { bit: 42, key: "USE_SOUNDBOARD", label: "Ses tahtası", group: "Ses" },
  { bit: 45, key: "USE_EXTERNAL_SOUNDS", label: "Harici sesler", group: "Ses" },
  { bit: 32, key: "REQUEST_TO_SPEAK", label: "Konuşma isteği", group: "Ses" },
  { bit: 22, key: "MUTE_MEMBERS", label: "Üyeleri sustur", group: "Ses" },
  { bit: 23, key: "DEAFEN_MEMBERS", label: "Üyeleri sağırlaştır", group: "Ses" },
  { bit: 24, key: "MOVE_MEMBERS", label: "Üyeleri taşı", group: "Ses" },

  { bit: 3, key: "ADMINISTRATOR", label: "Yönetici", group: "Yönetim" },
  { bit: 5, key: "MANAGE_GUILD", label: "Sunucuyu yönet", group: "Yönetim" },
  { bit: 28, key: "MANAGE_ROLES", label: "Rolleri yönet", group: "Yönetim" },
  { bit: 4, key: "MANAGE_CHANNELS", label: "Kanalları yönet", group: "Yönetim" },
  { bit: 29, key: "MANAGE_WEBHOOKS", label: "Webhook'ları yönet", group: "Yönetim" },
  { bit: 30, key: "MANAGE_GUILD_EXPRESSIONS", label: "İfadeleri yönet", group: "Yönetim" },
  { bit: 33, key: "MANAGE_EVENTS", label: "Etkinlikleri yönet", group: "Yönetim" },
  { bit: 2, key: "BAN_MEMBERS", label: "Üyeleri yasakla", group: "Yönetim" },
  { bit: 1, key: "KICK_MEMBERS", label: "Üyeleri at", group: "Yönetim" },
  { bit: 40, key: "MODERATE_MEMBERS", label: "Üyelere zaman aşımı", group: "Yönetim" },
  { bit: 27, key: "MANAGE_NICKNAMES", label: "Takma adları yönet", group: "Yönetim" },
  { bit: 7, key: "VIEW_AUDIT_LOG", label: "Denetim kaydını görüntüle", group: "Yönetim" },
  { bit: 19, key: "VIEW_GUILD_INSIGHTS", label: "Sunucu analizleri", group: "Yönetim" },
  {
    bit: 41,
    key: "VIEW_CREATOR_MONETIZATION_ANALYTICS",
    label: "Gelir analizleri",
    group: "Yönetim",
  },
];

export const toBig = (value: string | null | undefined): bigint => {
  try {
    return BigInt(value ?? "0");
  } catch {
    return 0n;
  }
};

export const hasBit = (mask: bigint, bit: number) => ((mask >> BigInt(bit)) & 1n) === 1n;

export const withBit = (mask: bigint, bit: number, on: boolean) =>
  on ? mask | (1n << BigInt(bit)) : mask & ~(1n << BigInt(bit));

export const permLabels = (mask: bigint) =>
  PERMISSIONS.filter((p) => hasBit(mask, p.bit)).map((p) => p.label);
