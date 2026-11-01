import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "./api";
import {
  ActionResult,
  ConfirmButton,
  buttonClass,
  inputClass,
  primaryButtonClass,
  usePanelAction,
} from "./actions";
import { ago } from "./format";
import { Badge, Card, Notice, selectClass } from "./ui";

export interface Account {
  username: string;
  level: string;
  source: "env" | "panel";
  telegram: string | null;
  discord_id: string | null;
  created_by: string | null;
  created_at: number | null;
  sessions: number;
  frozen_at: number | null;
  frozen_reason: string | null;
  frozen_by: string | null;
}

/** Panel hesapları: dondurma durumu; owner dondurup açabilir (kendisi hariç). */
export function Accounts({ owner, me }: { owner: boolean; me: string }) {
  const q = useQuery({
    queryKey: ["panel", "accounts"],
    queryFn: () => api<{ items: Account[] }>("GET", "/accounts"),
  });
  const freeze = usePanelAction(
    (name: string) =>
      api("POST", `/accounts/${encodeURIComponent(name)}/freeze`, { reason: "owner kararı" }),
    { success: "Hesap donduruldu" },
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const unfreeze = usePanelAction(
    (name: string) => api("POST", `/accounts/${encodeURIComponent(name)}/unfreeze`),
    { success: "Hesap açıldı" },
  );

  return (
    <Card
      title="Panel hesapları"
      action={
        owner && (
          <button type="button" className={buttonClass} onClick={() => setAdding(!adding)}>
            {adding ? "Vazgeç" : "Hesap ekle"}
          </button>
        )
      }
    >
      {owner && adding && <AccountForm account={null} onDone={() => setAdding(false)} />}
      <p className="mb-3 text-xs text-muted-foreground">
        Bir hesap 60 saniyede 5 ban/kick, 3 kanal/rol silme, 5 toplu silme, 10 susturma, 10
        emoji/davet/webhook silme ya da 20 üye düzenleme sınırını aşarsa anında dondurulur ve
        oturumları kapanır. Son 5 dakikadaki yasak ve susturmaları geri alınır, sildiği kanal ve
        roller yeniden kurulur. Dondurulan hesap giriş yapamaz; sadece owner açabilir. Tek owner
        donarsa panelden açılamaz: sunucuda{" "}
        <code>heroku run -a admin-667-api -- admin667 unfreeze &lt;kullanıcı&gt;</code>{" "}
        çalıştırılır.
      </p>
      {q.error ? (
        <Notice error={q.error} />
      ) : !q.data ? null : (
        <ul className="divide-y divide-border/50">
          {q.data.items.map((a) => (
            <li
              key={a.username}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm"
            >
              <span className="font-medium">{a.username}</span>
              <Badge tone={a.level === "owner" ? "accent" : "muted"}>{a.level}</Badge>
              {a.source === "env" && (
                <span className="text-xs text-muted-foreground" title="Sunucudaki env dosyasında">
                  env
                </span>
              )}
              {owner && a.telegram && (
                <span className="font-mono text-xs text-muted-foreground" title="Telegram ID">
                  {a.telegram}
                </span>
              )}
              {a.discord_id && (
                <span className="font-mono text-xs text-muted-foreground" title="Discord ID">
                  {a.discord_id}
                </span>
              )}
              {a.frozen_at ? (
                <Badge tone="danger">donduruldu</Badge>
              ) : a.sessions > 0 ? (
                <Badge tone="accent">çevrimiçi</Badge>
              ) : null}
              {owner && a.username !== me && (
                <span className="ml-auto flex items-center gap-2">
                  {a.source === "panel" && (
                    <button
                      type="button"
                      className={buttonClass}
                      onClick={() => setEditing(editing === a.username ? null : a.username)}
                    >
                      Düzenle
                    </button>
                  )}
                  {a.frozen_at ? (
                    <ConfirmButton
                      label="Aç"
                      confirmText="Hesap açılsın mı?"
                      danger={false}
                      busy={unfreeze.busy}
                      onConfirm={() => unfreeze.run(a.username)}
                    />
                  ) : (
                    <ConfirmButton
                      label="Dondur"
                      confirmText="Hesap dondurulsun ve oturumları kapansın mı?"
                      busy={freeze.busy}
                      onConfirm={() => freeze.run(a.username)}
                    />
                  )}
                </span>
              )}
              {owner && editing === a.username && (
                <AccountForm key={a.username} account={a} onDone={() => setEditing(null)} />
              )}
              {a.frozen_at && (
                <p className="w-full text-xs text-muted-foreground">
                  {ago(a.frozen_at)} · {a.frozen_by ?? "?"}
                  {a.frozen_reason ? ` · ${a.frozen_reason}` : ""}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
      <ActionResult msg={freeze.msg ?? unfreeze.msg} />
    </Card>
  );
}

function AccountForm({ account, onDone }: { account: Account | null; onDone: () => void }) {
  const [username, setUsername] = useState(account?.username ?? "");
  const [level, setLevel] = useState(account?.level === "admin" ? "admin" : "mod");
  const [telegram, setTelegram] = useState("");
  const [discord, setDiscord] = useState(account?.discord_id ?? "");
  const body = () => ({
    username,
    level,
    telegram_chat_id: telegram,
    discord_id: discord || null,
  });
  const save = usePanelAction(
    () =>
      account
        ? api("PATCH", `/accounts/${encodeURIComponent(account.username)}`, body())
        : api("POST", "/accounts", body()),
    { success: account ? "Hesap güncellendi" : "Hesap eklendi", onDone },
  );
  const remove = usePanelAction(
    () => api("DELETE", `/accounts/${encodeURIComponent(account?.username ?? "")}`),
    { success: "Hesap silindi", onDone },
  );

  return (
    <div className="mt-2 mb-3 w-full space-y-3 rounded-lg border border-border bg-background/40 p-4">
      <p className="text-xs text-muted-foreground">
        {account
          ? "Telegram ID'yi her düzenlemede yeniden gir. Seviye değişirse kişinin açık oturumları kapanır."
          : "Kişi önce panelin Telegram botuna /start yazmalı. Hesap eklenirken bot ona bir mesaj gönderir; mesaj gitmezse hesap eklenmez."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {!account && (
          <label className="space-y-1 text-xs text-muted-foreground">
            <span>Kullanıcı adı</span>
            <input
              value={username}
              maxLength={32}
              autoComplete="off"
              onChange={(e) => setUsername(e.target.value.toLowerCase())}
              placeholder="ör. ahmet"
              className={inputClass}
            />
          </label>
        )}
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Seviye</span>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className={`${selectClass} w-full`}
          >
            <option value="mod">mod</option>
            <option value="admin">admin</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Telegram ID</span>
          <input
            value={telegram}
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => setTelegram(e.target.value.replace(/[^0-9-]/g, ""))}
            placeholder="ör. 8344478317"
            className={inputClass}
          />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Discord ID (opsiyonel)</span>
          <input
            value={discord}
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => setDiscord(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="yetkili hiyerarşisi için"
            className={inputClass}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={save.busy || !telegram || (!account && !username)}
          onClick={() => save.run(undefined)}
          className={primaryButtonClass}
        >
          {account ? "Kaydet" : "Ekle"}
        </button>
        {account && (
          <ConfirmButton
            label="Hesabı sil"
            confirmText="Hesap silinsin ve oturumları kapansın mı?"
            busy={remove.busy}
            onConfirm={() => remove.run(undefined)}
          />
        )}
        <ActionResult msg={save.msg ?? remove.msg} />
      </div>
    </div>
  );
}
