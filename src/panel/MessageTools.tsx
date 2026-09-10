import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { api } from "./api";
import {
  ActionResult,
  ConfirmButton,
  buttonClass,
  inputClass,
  primaryButtonClass,
  usePanelAction,
} from "./actions";
import { useMeta } from "./hooks";
import type { MessageOut } from "./types";
import { Card, selectClass } from "./ui";

const MESSAGE_KINDS = ["text", "announcement", "voice", "stage"];

function useMessageChannels() {
  const meta = useMeta();
  return (meta.data?.channels ?? []).filter((c) => MESSAGE_KINDS.includes(c.kind));
}

type Field = { name: string; value: string; inline: boolean };

/** Bot adına mesaj ve embed gönderme. Varsayılan olarak kimse etiketlenmez. */
export function Composer() {
  const channels = useMessageChannels();
  const [channel, setChannel] = useState("");
  const [content, setContent] = useState("");
  const [useEmbed, setUseEmbed] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#8e64d7");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [footer, setFooter] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [allowMentions, setAllowMentions] = useState(false);

  const send = usePanelAction(
    () =>
      api("POST", "/messages/send", {
        channel_id: channel,
        content,
        allow_mentions: allowMentions,
        ...(useEmbed
          ? {
              embed: {
                title,
                description,
                color: parseInt(color.slice(1), 16),
                url,
                image,
                thumbnail,
                footer,
                fields,
              },
            }
          : {}),
      }),
    {
      success: "Mesaj gönderildi",
      onDone: () => {
        setContent("");
      },
    },
  );

  const setField = (i: number, patch: Partial<Field>) =>
    setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const hasEmbed =
    useEmbed && (title || description || image || fields.some((f) => f.name && f.value));

  return (
    <Card title="Bot ile mesaj gönder">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <select
            aria-label="Kanal"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            className={`${selectClass} w-full`}
          >
            <option value="">Kanal seç…</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </select>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="mesaj metni (en fazla 2000 karakter)"
            className={`${inputClass} h-auto py-2`}
          />
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={useEmbed}
                onChange={(e) => setUseEmbed(e.target.checked)}
                className="accent-accent"
              />
              embed ekle
            </label>
            <label
              className="flex items-center gap-2"
              title="@everyone ve @here hiçbir zaman etiketlenmez"
            >
              <input
                type="checkbox"
                checked={allowMentions}
                onChange={(e) => setAllowMentions(e.target.checked)}
                className="accent-accent"
              />
              kullanıcı/rol etiketleri çalışsın
            </label>
          </div>

          {useEmbed && (
            <div className="space-y-2 rounded-xl border border-border p-3">
              <div className="flex gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={256}
                  placeholder="başlık"
                  className={inputClass}
                />
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  aria-label="Renk"
                  className="h-9 w-10 shrink-0 cursor-pointer rounded border border-border bg-transparent"
                />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={4096}
                rows={4}
                placeholder="açıklama"
                className={`${inputClass} h-auto py-2`}
              />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="başlık bağlantısı (https://)"
                className={inputClass}
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="büyük görsel (https://)"
                  className={inputClass}
                />
                <input
                  value={thumbnail}
                  onChange={(e) => setThumbnail(e.target.value)}
                  placeholder="küçük görsel (https://)"
                  className={inputClass}
                />
              </div>
              <input
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                maxLength={2048}
                placeholder="alt bilgi"
                className={inputClass}
              />
              {fields.map((f, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    value={f.name}
                    onChange={(e) => setField(i, { name: e.target.value })}
                    maxLength={256}
                    placeholder="alan adı"
                    className={`${inputClass} flex-1`}
                  />
                  <input
                    value={f.value}
                    onChange={(e) => setField(i, { value: e.target.value })}
                    maxLength={1024}
                    placeholder="değer"
                    className={`${inputClass} flex-1`}
                  />
                  <label className="flex items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={f.inline}
                      onChange={(e) => setField(i, { inline: e.target.checked })}
                      className="accent-accent"
                    />
                    yan yana
                  </label>
                  <button
                    type="button"
                    aria-label="Alanı kaldır"
                    onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {fields.length < 25 && (
                <button
                  type="button"
                  onClick={() => setFields((fs) => [...fs, { name: "", value: "", inline: false }])}
                  className={buttonClass}
                >
                  <Plus className="h-3.5 w-3.5" /> alan ekle
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!channel || (!content.trim() && !hasEmbed) || send.busy}
              onClick={() => send.run(undefined)}
              className={primaryButtonClass}
            >
              Gönder
            </button>
            <ActionResult msg={send.msg} />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Önizleme</p>
          <div className="rounded-xl border border-border bg-[#1e1f22] p-4 text-sm text-[#dbdee1]">
            {content && <p className="break-words whitespace-pre-wrap">{content}</p>}
            {hasEmbed && (
              <div
                className="mt-2 max-w-md rounded border-l-4 bg-[#2b2d31] p-3"
                style={{ borderLeftColor: color }}
              >
                {title && <p className="font-semibold text-white">{title}</p>}
                {description && (
                  <p className="mt-1 break-words whitespace-pre-wrap text-[#dbdee1]">
                    {description}
                  </p>
                )}
                {fields.some((f) => f.name && f.value) && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {fields
                      .filter((f) => f.name && f.value)
                      .map((f, i) => (
                        <div key={i} className={f.inline ? "" : "col-span-3"}>
                          <p className="text-xs font-semibold text-white">{f.name}</p>
                          <p className="text-xs break-words whitespace-pre-wrap">{f.value}</p>
                        </div>
                      ))}
                  </div>
                )}
                {(image || thumbnail) && (
                  <p className="mt-2 text-[11px] text-[#949ba4]">
                    görsel Discord'da gösterilecek: {image || thumbnail}
                  </p>
                )}
                {footer && <p className="mt-2 text-[11px] text-[#949ba4]">{footer}</p>}
              </div>
            )}
            {!content && !hasEmbed && <p className="text-[#949ba4] italic">Mesaj boş</p>}
          </div>
        </div>
      </div>
    </Card>
  );
}

/** Kanalın son mesajlarından N tanesini siler (isteğe bağlı: tek bir kullanıcının). */
export function PurgeTool() {
  const channels = useMessageChannels();
  const [channel, setChannel] = useState("");
  const [count, setCount] = useState(10);
  const [user, setUser] = useState("");
  const [reason, setReason] = useState("");
  const purge = usePanelAction(
    () =>
      api<{ deleted: number }>("POST", "/messages/purge", {
        channel_id: channel,
        count,
        user_id: user.trim(),
        reason,
      }),
    { success: "Mesajlar silindi" },
  );
  return (
    <Card title="Toplu temizle">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Kanal"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className={selectClass}
        >
          <option value="">Kanal seç…</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          son
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
            className={`${inputClass} w-20`}
          />
          mesaj
        </label>
        <input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          placeholder="sadece bu kullanıcı (ID, isteğe bağlı)"
          className={`${inputClass} max-w-64`}
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="sebep"
          className={`${inputClass} max-w-48`}
        />
        {channel && (
          <ConfirmButton
            label="Temizle"
            confirmText={`Son ${count} mesaj silinsin mi?`}
            busy={purge.busy}
            onConfirm={() => purge.run(undefined)}
          />
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        14 günden eski mesajlar Discord'da toplu silinemez; en fazla 20 tanesi tek tek silinir.
        Silinen mesajlar logda kalır.
      </p>
      <ActionResult msg={purge.msg} />
    </Card>
  );
}

export function DeleteMessageButton({ m }: { m: MessageOut }) {
  const remove = usePanelAction(() => api("DELETE", `/messages/${m.channel_id}/${m.id}`), {
    success: "Mesaj silindi",
  });
  if (m.deleted_at) return null;
  return (
    <span className="inline-flex items-center gap-2">
      <ConfirmButton
        label="sil"
        confirmText="Discord'dan silinsin mi?"
        busy={remove.busy}
        onConfirm={() => remove.run(undefined)}
      />
      <ActionResult msg={remove.msg} />
    </span>
  );
}

export const TrashIcon = Trash2;
