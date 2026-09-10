import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Bot, Mic, Search } from "lucide-react";
import { api } from "@/panel/api";
import { ago, num, roleHex } from "@/panel/format";
import { useDebounced, useMeta } from "@/panel/hooks";
import { MemberDrawer } from "@/panel/MemberDetail";
import type { MemberList, Status } from "@/panel/types";
import { Avatar, Badge, Card, Notice, selectClass, StatusDot } from "@/panel/ui";

export const Route = createFileRoute("/panel/uyeler")({
  component: MembersPage,
});

const PAGE = 50;

function MembersPage() {
  const [text, setText] = useState("");
  const q = useDebounced(text.trim(), 250);
  const [status, setStatus] = useState<Status | "">("");
  const [role, setRole] = useState("");
  const [bots, setBots] = useState<"" | "only" | "hide">("");
  const [sort, setSort] = useState<"joined" | "name" | "created">("joined");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);

  const meta = useMeta();
  const roles = (meta.data?.roles ?? []).filter((r) => r.name !== "@everyone");
  const roleById = new Map(roles.map((r) => [r.id, r]));

  const params = new URLSearchParams({
    q,
    status,
    role,
    bots,
    sort,
    offset: String(page * PAGE),
    limit: String(PAGE),
  });
  const list = useQuery({
    queryKey: ["panel", "members", params.toString()],
    queryFn: () => api<MemberList>("GET", `/members?${params.toString()}`),
    placeholderData: keepPreviousData,
  });

  // Filtre değişince ilk sayfaya dön.
  const filter =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(0);
    };
  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex h-9 min-w-56 flex-1 items-center gap-2 rounded-lg border border-border bg-background/60 px-3 focus-within:border-accent">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <span className="sr-only">Üye ara</span>
          <input
            value={text}
            onChange={(e) => filter(setText)(e.target.value)}
            placeholder="ad, kullanıcı adı veya ID"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
          />
        </label>
        <select
          aria-label="Durum"
          value={status}
          onChange={(e) => filter(setStatus)(e.target.value as Status | "")}
          className={selectClass}
        >
          <option value="">Tüm durumlar</option>
          <option value="online">Çevrimiçi</option>
          <option value="idle">Boşta</option>
          <option value="dnd">Rahatsız etmeyin</option>
          <option value="offline">Çevrimdışı</option>
        </select>
        <select
          aria-label="Rol"
          value={role}
          onChange={(e) => filter(setRole)(e.target.value)}
          className={selectClass}
        >
          <option value="">Tüm roller</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Botlar"
          value={bots}
          onChange={(e) => filter(setBots)(e.target.value as "" | "only" | "hide")}
          className={selectClass}
        >
          <option value="">Botlar dahil</option>
          <option value="hide">Botları gizle</option>
          <option value="only">Sadece botlar</option>
        </select>
        <select
          aria-label="Sıralama"
          value={sort}
          onChange={(e) => filter(setSort)(e.target.value as typeof sort)}
          className={selectClass}
        >
          <option value="joined">Katılma (yeni → eski)</option>
          <option value="created">Hesap yaşı (yeni → eski)</option>
          <option value="name">Ad (A → Z)</option>
        </select>
      </div>

      <Card title={`${num(total)} üye`}>
        {list.error ? (
          <Notice error={list.error} />
        ) : list.isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>
        ) : list.data.items.length === 0 ? (
          <Notice empty="Filtreye uyan üye yok" />
        ) : (
          <div
            className={`overflow-x-auto transition-opacity ${list.isPlaceholderData ? "opacity-60" : ""}`}
          >
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-normal">Üye</th>
                  <th className="px-3 py-2 font-normal">Roller</th>
                  <th className="px-3 py-2 font-normal whitespace-nowrap">Katılma</th>
                  <th className="py-2 pl-3 font-normal whitespace-nowrap">Hesap</th>
                </tr>
              </thead>
              <tbody>
                {list.data.items.map((m) => {
                  const memberRoles = m.roles
                    .map((id) => roleById.get(id))
                    .filter((r) => r !== undefined)
                    .sort((a, b) => b.position - a.position);
                  return (
                    <tr
                      key={m.id}
                      tabIndex={0}
                      onClick={() => setOpen(m.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setOpen(m.id);
                      }}
                      className="cursor-pointer border-b border-border/50 transition-colors last:border-0 hover:bg-background/50 focus:bg-background/50 focus:outline-none"
                    >
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-3">
                          <Avatar src={m.avatar} size={32} />
                          <div className="min-w-0">
                            <p className="flex items-center gap-2">
                              <StatusDot status={m.status} />
                              <span
                                className="truncate font-medium"
                                style={{ color: roleHex(m.color) }}
                              >
                                {m.display_name}
                              </span>
                              {m.bot && (
                                <Badge>
                                  <Bot className="h-2.5 w-2.5" /> bot
                                </Badge>
                              )}
                              {m.in_voice && (
                                <Mic className="h-3.5 w-3.5 text-accent" aria-label="seste" />
                              )}
                              {m.timed_out_until && <Badge tone="danger">timeout</Badge>}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">@{m.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {memberRoles.slice(0, 3).map((r) => (
                            <span
                              key={r.id}
                              className="flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] whitespace-nowrap"
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: roleHex(r.color) ?? "#5d5669" }}
                              />
                              {r.name}
                            </span>
                          ))}
                          {memberRoles.length > 3 && (
                            <span className="text-[11px] text-muted-foreground">
                              +{memberRoles.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap text-muted-foreground">
                        {ago(m.joined_at)}
                      </td>
                      <td className="py-2 pl-3 text-xs whitespace-nowrap text-muted-foreground">
                        {ago(m.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-3 text-xs text-muted-foreground">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-border px-3 py-1 hover:text-foreground disabled:opacity-40"
            >
              önceki
            </button>
            <span className="tabular-nums">
              {page + 1} / {pages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-border px-3 py-1 hover:text-foreground disabled:opacity-40"
            >
              sonraki
            </button>
          </div>
        )}
      </Card>

      <MemberDrawer id={open} onClose={close} />
    </div>
  );
}
