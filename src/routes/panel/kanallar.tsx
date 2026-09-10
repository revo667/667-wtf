import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Folder, Hash, Lock, Megaphone, MessagesSquare, Mic, Plus, Radio } from "lucide-react";
import { api } from "@/panel/api";
import {
  ActionResult,
  ConfirmButton,
  buttonClass,
  inputClass,
  primaryButtonClass,
  usePanelAction,
} from "@/panel/actions";
import { Drawer } from "@/panel/Drawer";
import { useMeta } from "@/panel/hooks";
import { GROUPS, PERMISSIONS, hasBit, toBig, withBit } from "@/panel/permissions";
import { useSession } from "@/panel/session";
import { Badge, Card, Notice, selectClass } from "@/panel/ui";

export const Route = createFileRoute("/panel/kanallar")({
  component: ChannelsPage,
});

interface Overwrite {
  id: string;
  kind: "role" | "member";
  name: string;
  allow: string;
  deny: string;
  forbidden: string[];
}

interface ChannelOut {
  id: string;
  name: string;
  kind: string;
  parent_id: string | null;
  position: number;
  topic: string | null;
  nsfw: boolean;
  slowmode: number;
  bitrate: number | null;
  user_limit: number | null;
  overwrites: Overwrite[];
}

const KIND_LABEL: Record<string, string> = {
  text: "Yazı",
  voice: "Ses",
  category: "Kategori",
  announcement: "Duyuru",
  stage: "Sahne",
  forum: "Forum",
};

function KindIcon({ kind }: { kind: string }) {
  const cls = "h-4 w-4 shrink-0 text-muted-foreground";
  switch (kind) {
    case "voice":
      return <Mic className={cls} />;
    case "stage":
      return <Radio className={cls} />;
    case "announcement":
      return <Megaphone className={cls} />;
    case "forum":
      return <MessagesSquare className={cls} />;
    case "category":
      return <Folder className={cls} />;
    default:
      return <Hash className={cls} />;
  }
}

type Editing = { mode: "new"; parent: string } | { mode: "edit"; channel: ChannelOut } | null;

function ChannelsPage() {
  const session = useSession();
  const canEdit = session.level !== "mod";
  const q = useQuery({
    queryKey: ["panel", "channels"],
    queryFn: () => api<{ channels: ChannelOut[] }>("GET", "/channels"),
  });
  const [editing, setEditing] = useState<Editing>(null);
  const close = useCallback(() => setEditing(null), []);

  if (q.error) return <Notice error={q.error} />;
  const channels = q.data?.channels ?? [];
  const categories = channels.filter((c) => c.kind === "category");
  const loose = channels.filter((c) => c.kind !== "category" && !c.parent_id);
  const childrenOf = (id: string) => channels.filter((c) => c.parent_id === id);
  const selected =
    editing?.mode === "edit"
      ? (channels.find((c) => c.id === editing.channel.id) ?? editing.channel)
      : null;

  const row = (c: ChannelOut) => (
    <li key={c.id} className="flex items-center gap-2 py-1.5 pl-2">
      <KindIcon kind={c.kind} />
      <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
      {c.overwrites.length > 0 && (
        <span title="Bu kanalda özel izinler var">
          <Lock className="h-3 w-3 text-muted-foreground" />
        </span>
      )}
      {c.nsfw && <Badge tone="danger">nsfw</Badge>}
      {c.slowmode > 0 && <Badge>yavaş {c.slowmode} sn</Badge>}
      {c.overwrites.some((o) => o.forbidden.length > 0) && (
        <Badge tone="danger">yasaklı izin</Badge>
      )}
      {canEdit && (
        <button
          type="button"
          onClick={() => setEditing({ mode: "edit", channel: c })}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-background/60 hover:text-foreground"
        >
          düzenle
        </button>
      )}
    </li>
  );

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setEditing({ mode: "new", parent: "" })}
            className={primaryButtonClass}
          >
            <Plus className="h-4 w-4" /> Yeni kanal
          </button>
        </div>
      )}
      {!q.data ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {loose.length > 0 && (
            <Card title="Kategorisiz">
              <ul>{loose.map(row)}</ul>
            </Card>
          )}
          {categories.map((cat) => (
            <Card
              key={cat.id}
              title={<span className="uppercase tracking-wider">{cat.name}</span>}
              action={
                canEdit && (
                  <span className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing({ mode: "new", parent: cat.id })}
                      className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    >
                      + kanal
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing({ mode: "edit", channel: cat })}
                      className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    >
                      düzenle
                    </button>
                  </span>
                )
              }
            >
              {childrenOf(cat.id).length === 0 ? (
                <Notice empty="Boş kategori" />
              ) : (
                <ul>{childrenOf(cat.id).map(row)}</ul>
              )}
            </Card>
          ))}
        </div>
      )}

      <Drawer
        open={editing !== null}
        onClose={close}
        title={editing?.mode === "new" ? "Yeni kanal" : (selected?.name ?? "")}
      >
        {editing?.mode === "new" && (
          <NewChannel parent={editing.parent} categories={categories} onDone={close} />
        )}
        {selected && (
          <EditChannel
            key={selected.id}
            channel={selected}
            categories={categories}
            onDone={close}
          />
        )}
      </Drawer>
    </div>
  );
}

function NewChannel({
  parent,
  categories,
  onDone,
}: {
  parent: string;
  categories: ChannelOut[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState("text");
  const [parentId, setParentId] = useState(parent);
  const create = usePanelAction(
    () =>
      api("POST", "/channels", {
        name: name.trim(),
        kind,
        parent_id: kind === "category" ? "" : parentId,
      }),
    { success: "Kanal oluşturuldu", onDone },
  );
  return (
    <div className="space-y-4">
      <label className="block space-y-1.5 text-sm">
        <span className="text-muted-foreground">Ad</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className={inputClass}
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Tür"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className={selectClass}
        >
          {Object.entries(KIND_LABEL).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
        {kind !== "category" && (
          <select
            aria-label="Kategori"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className={selectClass}
          >
            <option value="">Kategorisiz</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={create.busy || !name.trim()}
          onClick={() => create.run(undefined)}
          className={primaryButtonClass}
        >
          Oluştur
        </button>
        <ActionResult msg={create.msg} />
      </div>
    </div>
  );
}

function EditChannel({
  channel,
  categories,
  onDone,
}: {
  channel: ChannelOut;
  categories: ChannelOut[];
  onDone: () => void;
}) {
  const [name, setName] = useState(channel.name);
  const [topic, setTopic] = useState(channel.topic ?? "");
  const [nsfw, setNsfw] = useState(channel.nsfw);
  const [slowmode, setSlowmode] = useState(channel.slowmode);
  const [parentId, setParentId] = useState(channel.parent_id ?? "");
  const isText = ["text", "announcement", "forum"].includes(channel.kind);
  const isCategory = channel.kind === "category";

  const save = usePanelAction(
    () =>
      api("PATCH", `/channels/${channel.id}`, {
        name: name.trim(),
        ...(isText ? { topic, nsfw, slowmode } : {}),
        ...(isCategory ? {} : { parent_id: parentId }),
      }),
    { success: "Kanal güncellendi" },
  );
  const remove = usePanelAction(() => api("DELETE", `/channels/${channel.id}`), {
    success: "Kanal silindi",
    onDone,
  });

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">
            Ad · {KIND_LABEL[channel.kind] ?? channel.kind}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className={inputClass}
          />
        </label>
        {isText && (
          <>
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted-foreground">Konu</span>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                maxLength={1024}
                rows={2}
                className={`${inputClass} h-auto py-2`}
              />
            </label>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Yavaş mod</span>
                <select
                  value={slowmode}
                  onChange={(e) => setSlowmode(Number(e.target.value))}
                  className={selectClass}
                >
                  {[0, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 21600].map((s) => (
                    <option key={s} value={s}>
                      {s === 0
                        ? "kapalı"
                        : s < 60
                          ? `${s} sn`
                          : s < 3600
                            ? `${s / 60} dk`
                            : `${s / 3600} sa`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={nsfw}
                  onChange={(e) => setNsfw(e.target.checked)}
                  className="accent-accent"
                />
                yaş kısıtlamalı (NSFW)
              </label>
            </div>
          </>
        )}
        {!isCategory && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Kategori</span>
            <select
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
              className={selectClass}
            >
              <option value="">Kategorisiz</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={save.busy || !name.trim()}
            onClick={() => save.run(undefined)}
            className={primaryButtonClass}
          >
            Kaydet
          </button>
          <ConfirmButton
            label="Kanalı sil"
            confirmText={`#${channel.name} silinsin mi? Geri alınamaz.`}
            busy={remove.busy}
            onConfirm={() => remove.run(undefined)}
          />
          <ActionResult msg={save.msg ?? remove.msg} />
        </div>
      </section>

      <Overwrites channel={channel} />
    </div>
  );
}

/** Kanal izinleri: her hedef (rol/üye) için her yetki üç durumlu: izin ver / varsayılan / reddet. */
function Overwrites({ channel }: { channel: ChannelOut }) {
  const meta = useMeta();
  const [open, setOpen] = useState<string | null>(null);
  const [addRole, setAddRole] = useState("");
  const add = usePanelAction(
    () =>
      api("PUT", `/channels/${channel.id}/overwrites/${addRole}`, {
        kind: "role",
        allow: "0",
        deny: "0",
      }),
    { success: "İzin hedefi eklendi" },
  );
  const existing = new Set(channel.overwrites.map((o) => o.id));
  const roles = (meta.data?.roles ?? []).filter((r) => !existing.has(r.id));

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Kanal izinleri</h3>
      {channel.overwrites.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Özel izin yok; kategori ya da sunucu izinleri geçerli.
        </p>
      )}
      <ul className="space-y-2">
        {channel.overwrites.map((o) => (
          <li key={o.id} className="rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setOpen(open === o.id ? null : o.id)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm"
            >
              <span className="flex-1">
                {o.kind === "member" ? "👤 " : ""}
                {o.name}
              </span>
              {o.forbidden.length > 0 && (
                <Badge tone="danger">yasaklı: {o.forbidden.join(", ")}</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {open === o.id ? "kapat" : "düzenle"}
              </span>
            </button>
            {open === o.id && <OverwriteEditor channelId={channel.id} overwrite={o} />}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Rol ekle"
          value={addRole}
          onChange={(e) => setAddRole(e.target.value)}
          className={selectClass}
        >
          <option value="">Rol için izin ekle…</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={!addRole || add.busy}
          onClick={() => add.run(undefined)}
          className={buttonClass}
        >
          Ekle
        </button>
        <ActionResult msg={add.msg} />
      </div>
    </section>
  );
}

function OverwriteEditor({ channelId, overwrite }: { channelId: string; overwrite: Overwrite }) {
  const [allow, setAllow] = useState(() => toBig(overwrite.allow));
  const [deny, setDeny] = useState(() => toBig(overwrite.deny));
  const save = usePanelAction(
    () =>
      api("PUT", `/channels/${channelId}/overwrites/${overwrite.id}`, {
        kind: overwrite.kind,
        allow: allow.toString(),
        deny: deny.toString(),
      }),
    { success: "İzinler kaydedildi" },
  );
  const remove = usePanelAction(
    () => api("DELETE", `/channels/${channelId}/overwrites/${overwrite.id}?kind=${overwrite.kind}`),
    { success: "İzin kaldırıldı" },
  );

  const set = (bit: number, state: "allow" | "inherit" | "deny") => {
    setAllow((m) => withBit(m, bit, state === "allow"));
    setDeny((m) => withBit(m, bit, state === "deny"));
  };

  return (
    <div className="space-y-4 border-t border-border p-3">
      {GROUPS.filter((g) => g !== "Yönetim").map((group) => (
        <div key={group}>
          <p className="mb-1 text-xs text-muted-foreground">{group}</p>
          <div className="space-y-1">
            {PERMISSIONS.filter((p) => p.group === group).map((p) => {
              const state = hasBit(allow, p.bit)
                ? "allow"
                : hasBit(deny, p.bit)
                  ? "deny"
                  : "inherit";
              return (
                <div key={p.key} className="flex items-center gap-2 text-sm">
                  <span className="flex-1">{p.label}</span>
                  {(["deny", "inherit", "allow"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={state === s}
                      onClick={() => set(p.bit, s)}
                      className={`h-7 w-8 rounded-md border text-xs ${
                        state === s
                          ? s === "allow"
                            ? "border-accent bg-accent/20 text-accent"
                            : s === "deny"
                              ? "border-destructive bg-destructive/15 text-destructive"
                              : "border-border bg-background text-foreground"
                          : "border-border/50 text-muted-foreground/60 hover:text-foreground"
                      }`}
                      title={s === "allow" ? "İzin ver" : s === "deny" ? "Reddet" : "Varsayılan"}
                    >
                      {s === "allow" ? "✓" : s === "deny" ? "✕" : "/"}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={save.busy}
          onClick={() => save.run(undefined)}
          className={primaryButtonClass}
        >
          İzinleri kaydet
        </button>
        <ConfirmButton
          label="Kaldır"
          confirmText="Bu izin hedefi kaldırılsın mı?"
          busy={remove.busy}
          onConfirm={() => remove.run(undefined)}
        />
        <ActionResult msg={save.msg ?? remove.msg} />
      </div>
    </div>
  );
}
