import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { api } from "./api";
import {
  ActionResult,
  ConfirmButton,
  buttonClass,
  inputClass,
  primaryButtonClass,
  usePanelAction,
} from "./actions";
import { roleHex } from "./format";
import { useMeta } from "./hooks";
import { useSession } from "./session";
import type { MemberRow } from "./types";
import { selectClass } from "./ui";

type RoleInfo = {
  id: string;
  name: string;
  color: number;
  position: number;
  assignable: boolean;
  forbidden: string[];
};

const TIMEOUTS = [
  { minutes: 5, label: "5 dakika" },
  { minutes: 10, label: "10 dakika" },
  { minutes: 60, label: "1 saat" },
  { minutes: 360, label: "6 saat" },
  { minutes: 1440, label: "1 gün" },
  { minutes: 10080, label: "1 hafta" },
  { minutes: 40320, label: "28 gün" },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-xl border border-border">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm select-none hover:text-accent">
        <span className="mr-2 inline-block text-muted-foreground transition-transform group-open:rotate-90">
          ›
        </span>
        {title}
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-3">{children}</div>
    </details>
  );
}

/** Üye çekmecesindeki işlemler. Görünürlük panel seviyesine göre; asıl kontrol backend'de. */
export function MemberActions({
  member,
  voiceChannelId,
}: {
  member: MemberRow;
  voiceChannelId: string | null;
}) {
  const session = useSession();
  const isAdmin = session.level !== "mod";
  const base = `/members/${member.id}`;

  const [nick, setNick] = useState(
    member.display_name === member.username ? "" : member.display_name,
  );
  const [minutes, setMinutes] = useState(60);
  const [reason, setReason] = useState("");
  const [deleteDays, setDeleteDays] = useState(0);
  const [moveTo, setMoveTo] = useState("");

  const saveNick = usePanelAction(() => api("PATCH", base, { nick }), {
    success: "Takma ad güncellendi",
  });
  const timeout = usePanelAction(() => api("POST", `${base}/timeout`, { minutes, reason }), {
    success: "Zaman aşımı verildi",
  });
  const untimeout = usePanelAction(() => api("DELETE", `${base}/timeout`), {
    success: "Zaman aşımı kaldırıldı",
  });
  const kick = usePanelAction(() => api("POST", `${base}/kick`, { reason }), {
    success: "Üye atıldı",
  });
  const ban = usePanelAction(
    () => api("POST", `${base}/ban`, { reason, delete_days: deleteDays }),
    { success: "Üye yasaklandı" },
  );
  const voice = usePanelAction(
    (channel: string) => api("POST", `${base}/voice`, { channel_id: channel }),
    {
      success: "Ses işlemi yapıldı",
    },
  );

  const meta = useMeta();
  const voiceChannels = (meta.data?.channels ?? []).filter(
    (c) => (c.kind === "voice" || c.kind === "stage") && c.id !== voiceChannelId,
  );

  const reasonInput = (
    <input
      value={reason}
      onChange={(e) => setReason(e.target.value)}
      maxLength={400}
      placeholder="sebep (Discord denetim kaydına yazılır)"
      className={inputClass}
    />
  );

  return (
    <div className="space-y-2">
      <Section title="Takma ad">
        <div className="flex gap-2">
          <input
            value={nick}
            onChange={(e) => setNick(e.target.value)}
            maxLength={32}
            placeholder="boş = sıfırla"
            className={inputClass}
          />
          <button
            type="button"
            disabled={saveNick.busy}
            onClick={() => saveNick.run(undefined)}
            className={buttonClass}
          >
            Kaydet
          </button>
        </div>
        <ActionResult msg={saveNick.msg} />
      </Section>

      {isAdmin && (
        <Section title="Roller">
          <RoleEditor member={member} />
        </Section>
      )}

      <Section title="Zaman aşımı">
        {member.timed_out_until ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Üye şu an zaman aşımında.</span>
            <button
              type="button"
              disabled={untimeout.busy}
              onClick={() => untimeout.run(undefined)}
              className={buttonClass}
            >
              Kaldır
            </button>
          </div>
        ) : (
          <>
            <select
              aria-label="Süre"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              className={selectClass}
            >
              {TIMEOUTS.map((t) => (
                <option key={t.minutes} value={t.minutes}>
                  {t.label}
                </option>
              ))}
            </select>
            {reasonInput}
            <button
              type="button"
              disabled={timeout.busy}
              onClick={() => timeout.run(undefined)}
              className={primaryButtonClass}
            >
              Zaman aşımı ver
            </button>
          </>
        )}
        <ActionResult msg={timeout.msg ?? untimeout.msg} />
      </Section>

      {member.in_voice && (
        <Section title="Ses">
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Taşınacak kanal"
              value={moveTo}
              onChange={(e) => setMoveTo(e.target.value)}
              className={selectClass}
            >
              <option value="">Kanal seç…</option>
              {voiceChannels.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!moveTo || voice.busy}
              onClick={() => voice.run(moveTo)}
              className={buttonClass}
            >
              Taşı
            </button>
            <button
              type="button"
              disabled={voice.busy}
              onClick={() => voice.run("")}
              className={buttonClass}
            >
              Sesten at
            </button>
          </div>
          <ActionResult msg={voice.msg} />
        </Section>
      )}

      <Section title="Sunucudan at">
        {reasonInput}
        <ConfirmButton
          label="At"
          confirmText={`${member.display_name} sunucudan atılsın mı?`}
          busy={kick.busy}
          onConfirm={() => kick.run(undefined)}
        />
        <ActionResult msg={kick.msg} />
      </Section>

      {isAdmin && (
        <Section title="Yasakla">
          {reasonInput}
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Son mesajlarını sil</span>
            <select
              value={deleteDays}
              onChange={(e) => setDeleteDays(Number(e.target.value))}
              className={selectClass}
            >
              {[0, 1, 3, 7].map((d) => (
                <option key={d} value={d}>
                  {d === 0 ? "silme" : `son ${d} gün`}
                </option>
              ))}
            </select>
          </label>
          <ConfirmButton
            label="Yasakla"
            confirmText={`${member.display_name} yasaklansın mı?`}
            busy={ban.busy}
            onConfirm={() => ban.run(undefined)}
          />
          <ActionResult msg={ban.msg} />
        </Section>
      )}
    </div>
  );
}

function RoleEditor({ member }: { member: MemberRow }) {
  const roles = useQuery({
    queryKey: ["panel", "roles"],
    queryFn: () => api<{ roles: RoleInfo[] }>("GET", "/roles"),
  });
  const [selected, setSelected] = useState(() => new Set(member.roles));
  const save = usePanelAction(
    () => api("PATCH", `/members/${member.id}`, { roles: [...selected] }),
    {
      success: "Roller güncellendi",
    },
  );
  const list = (roles.data?.roles ?? []).filter((r) => r.assignable || member.roles.includes(r.id));

  return (
    <>
      <ul className="max-h-64 space-y-1 overflow-y-auto">
        {list.map((r) => {
          const blocked = !r.assignable || (r.forbidden.length > 0 && !member.roles.includes(r.id));
          return (
            <li key={r.id}>
              <label
                className={`flex items-center gap-2 text-sm ${blocked ? "text-muted-foreground/50" : ""}`}
                title={
                  !r.assignable
                    ? "Bot bu rolü yönetemez"
                    : r.forbidden.length > 0
                      ? "Rolde yasaklı yetki var"
                      : undefined
                }
              >
                <input
                  type="checkbox"
                  disabled={blocked}
                  checked={selected.has(r.id)}
                  onChange={(e) =>
                    setSelected((s) => {
                      const next = new Set(s);
                      if (e.target.checked) next.add(r.id);
                      else next.delete(r.id);
                      return next;
                    })
                  }
                  className="accent-accent"
                />
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: roleHex(r.color) ?? "#5d5669" }}
                />
                {r.name}
              </label>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={save.busy}
        onClick={() => save.run(undefined)}
        className={primaryButtonClass}
      >
        Rolleri kaydet
      </button>
      <ActionResult msg={save.msg} />
    </>
  );
}
