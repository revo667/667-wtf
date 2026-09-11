import { useState } from "react";
import { api } from "./api";
import { ActionResult, ConfirmButton, inputClass, usePanelAction } from "./actions";
import { useMeta } from "./hooks";
import type { MessageOut } from "./types";
import { Card, selectClass } from "./ui";

const MESSAGE_KINDS = ["text", "announcement", "voice", "stage"];

function useMessageChannels() {
  const meta = useMeta();
  return (meta.data?.channels ?? []).filter((c) => MESSAGE_KINDS.includes(c.kind));
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
