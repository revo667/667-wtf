// Backend (667-admin) API yanıt tipleri. Discord ID'leri JS'te hassasiyet kaybolmasın diye string.

export type Status = "online" | "idle" | "dnd" | "offline";

export interface Overview {
  id: string;
  name: string;
  icon: string | null;
  owner_id: string;
  owner_name: string | null;
  created_at: number;
  member_count: number;
  humans: number;
  bots: number;
  status: { online: number; idle: number; dnd: number; offline: number };
  in_voice: number;
  roles: number;
  channels: { text: number; voice: number; category: number; other: number };
  boost_tier: number;
  boosts: number;
  verification_level: number;
  mfa_level: number;
  vanity: string | null;
  bot_ready: boolean;
}

export interface ChannelMeta {
  id: string;
  name: string;
  kind: string;
  parent_id: string | null;
  position: number;
}

export interface RoleMeta {
  id: string;
  name: string;
  color: number;
  position: number;
  managed: boolean;
}

export interface Meta {
  channels: ChannelMeta[];
  roles: RoleMeta[];
}

export interface DayRow {
  day: number;
  messages: number;
  joins: number;
  leaves: number;
  voice_seconds: number;
}

export interface TopRow {
  id: string;
  name: string;
  avatar: string | null;
  value: number;
}

export interface StatsOut {
  days: DayRow[];
  top_messages: TopRow[];
  top_voice: TopRow[];
}

export interface MemberRow {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  bot: boolean;
  roles: string[];
  color: number | null;
  joined_at: number | null;
  created_at: number;
  status: Status;
  timed_out_until: number | null;
  in_voice: boolean;
}

export interface MemberList {
  total: number;
  items: MemberRow[];
}

export interface Attachment {
  filename: string;
  url: string;
  size: number;
  content_type: string | null;
}

export interface MessageOut {
  id: string;
  channel_id: string;
  channel: string | null;
  author_id: string;
  author: string;
  avatar: string | null;
  author_bot: boolean;
  content: string;
  attachments: Attachment[];
  embeds_count: number;
  reply_to: string | null;
  created_at: number;
  edited_at: number | null;
  deleted_at: number | null;
  edits: { at: number; content: string }[];
}

export interface MessagePage {
  items: MessageOut[];
  next_before: string | null;
}

export interface Activity {
  kind: string;
  name: string;
  state: string | null;
  details: string | null;
}

export interface MemberDetail {
  id: string;
  member: MemberRow | null;
  profile: {
    nick?: string | null;
    global_name?: string | null;
    premium_since?: number | null;
    activities?: Activity[];
    voice?: { id: string; name: string | null } | null;
    voice_since?: number | null;
  };
  stats: {
    messages_total: number;
    voice_seconds_total: number;
    messages_30d: number;
    voice_seconds_30d: number;
    last_message_at: number | null;
    last_voice_at: number | null;
    last_online_at: number | null;
    daily: { day: number; messages: number; voice_seconds: number }[];
  };
  recent_messages: MessageOut[];
  events: { kind: string; at: number; detail: Record<string, unknown> }[];
}

export type LiveEvent =
  | {
      type: "message";
      id: string;
      channel_id: string;
      author_id: string;
      author: string;
      avatar: string;
      content: string;
      at: number;
    }
  | { type: "message_edit"; id: string; channel_id: string; content: string; at: number }
  | { type: "message_delete"; ids: string[]; channel_id: string; at: number }
  | {
      type: "member_join";
      id: string;
      name: string;
      avatar: string;
      account_created: number;
      at: number;
    }
  | { type: "member_leave"; id: string; name: string; at: number }
  | { type: "voice"; user_id: string; channel_id: string | null; at: number }
  | { type: "protection"; module: string; severity: string; summary: string; at: number };
