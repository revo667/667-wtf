import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { ActionResult, ConfirmButton, usePanelAction } from "./actions";
import { ago } from "./format";
import { Badge, Card, Notice } from "./ui";

export interface Account {
  username: string;
  level: string;
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
  const unfreeze = usePanelAction(
    (name: string) => api("POST", `/accounts/${encodeURIComponent(name)}/unfreeze`),
    { success: "Hesap açıldı" },
  );

  return (
    <Card title="Panel hesapları">
      <p className="mb-3 text-xs text-muted-foreground">
        Bir hesap 60 saniyede 5 ban/kick, 3 kanal/rol silme, 5 toplu silme, 10 susturma, 10
        emoji/davet/webhook silme ya da 20 üye düzenleme sınırını aşarsa anında dondurulur ve
        oturumları kapanır. Son 5 dakikadaki yasak ve susturmaları geri alınır, sildiği kanal ve
        roller yeniden kurulur. Dondurulan hesap giriş yapamaz; sadece owner açabilir.
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
              <Badge>{a.level}</Badge>
              {a.frozen_at ? (
                <Badge tone="danger">donduruldu</Badge>
              ) : a.sessions > 0 ? (
                <Badge tone="accent">çevrimiçi</Badge>
              ) : null}
              {owner && a.username !== me && (
                <span className="ml-auto">
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
