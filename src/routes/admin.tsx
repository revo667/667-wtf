import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import {
  APP_KEYS,
  APP_LABELS,
  adminAccess,
  adminInspect,
  adminJournal,
  adminJournalUser,
  adminRevoke,
  adminSetAccess,
  adminUsers,
  me,
  signInUrl,
  type AdminUser,
  type DataTable,
  type AppKey,
  type JournalUser,
} from "@/lib/account";

type Phase = "loading" | "anonymous" | "denied" | "ready" | "error";

function when(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);

  if (days === 0) return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "dun";
  if (days < 30) return `${days} gun once`;

  return date.toLocaleDateString("tr-TR");
}

function Toggle({
  on,
  onChange,
  labelOn = "acik",
  labelOff = "kapali",
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  labelOn?: string;
  labelOff?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className={`rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-widest transition-colors ${
        on
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
          : "border-white/15 bg-white/5 text-white/35"
      }`}
    >
      {on ? labelOn : labelOff}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="font-mono text-[10px] tracking-widest text-white/35">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums text-white">{value}</div>
    </div>
  );
}

function AdminPanel() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<AppKey>("universe");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [summary, setSummary] = useState({ total: 0, devices: 0, activeWeek: 0 });
  const [journal, setJournal] = useState<JournalUser[]>([]);
  const [journalReady, setJournalReady] = useState(true);
  const [access, setAccess] = useState<Record<string, Record<string, boolean>>>({});

  const load = async () => {
    const [report, accessReport] = await Promise.all([adminUsers(), adminAccess()]);

    setUsers(report.users);
    setSummary(report.summary);

    const map: Record<string, Record<string, boolean>> = {};

    for (const user of report.users) {
      map[user.id] = { universe: true, trading: true, utility: true };
    }

    for (const row of accessReport.rows) {
      const entry = (map[row.user_id] ??= { universe: true, trading: true, utility: true });
      entry[row.app] = Boolean(row.enabled);
    }

    setAccess(map);

    const journalReport = await adminJournal();

    setJournal(journalReport.users);
    setJournalReady(journalReport.available);
  };

  useEffect(() => {
    me()
      .then(async (account) => {
        if (!account) {
          setPhase("anonymous");
          return;
        }

        try {
          await load();
          setPhase("ready");
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "Beklenmeyen hata";

          setError(message);
          setPhase(message.includes("yonetici") ? "denied" : "error");
        }
      })
      .catch(() => setPhase("anonymous"));
  }, []);

  const toggleAccess = async (userId: string, app: AppKey, enabled: boolean) => {
    setAccess((current) => ({ ...current, [userId]: { ...current[userId], [app]: enabled } }));

    try {
      await adminSetAccess(userId, app, enabled);
    } catch {
      setAccess((current) => ({ ...current, [userId]: { ...current[userId], [app]: !enabled } }));
    }
  };

  const patchJournal = async (id: string, patch: { isActive?: boolean; role?: string }) => {
    setJournal((rows) =>
      rows.map((row) =>
        row.id === id
          ? { ...row, isActive: patch.isActive ?? row.isActive, role: patch.role ?? row.role }
          : row,
      ),
    );

    try {
      await adminJournalUser(id, patch);
    } catch {
      const report = await adminJournal();
      setJournal(report.users);
    }
  };

  const utilityCount = useMemo(
    () => users.filter((user) => access[user.id]?.["utility"] !== false).length,
    [users, access],
  );

  if (phase === "loading") {
    return (
      <Frame>
        <p className="font-mono text-[11px] tracking-widest text-white/30">YUKLENIYOR...</p>
      </Frame>
    );
  }

  if (phase === "anonymous") {
    return (
      <Frame>
        <p className="text-white/60">Bu panel yonetici hesabina ait.</p>
        <a
          href={signInUrl(
            typeof window === "undefined" ? "/admin" : `${window.location.origin}/admin`,
          )}
          className="mt-5 inline-flex rounded-lg bg-white px-4 py-2 text-sm font-medium text-neutral-950"
        >
          GitHub ile giris yap
        </a>
      </Frame>
    );
  }

  if (phase === "denied") {
    return (
      <Frame>
        <p className="text-rose-300">Bu alan yonetici hesabina ait.</p>
      </Frame>
    );
  }

  if (phase === "error") {
    return (
      <Frame>
        <p className="text-rose-300">{error}</p>
      </Frame>
    );
  }

  return (
    <Frame wide>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="HESAP" value={summary.total} />
        <Stat label="BAGLI CIHAZ" value={summary.devices} />
        <Stat label="JOURNAL KULLANICISI" value={journal.length} />
        <Stat label="UTILITY ERISIMI" value={utilityCount} />
      </div>

      <div className="mt-8 flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
        {APP_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg px-3 py-2 font-mono text-[11px] tracking-widest transition-colors ${
              tab === key ? "bg-violet-500/20 text-white" : "text-white/40 hover:text-white/70"
            }`}
          >
            {APP_LABELS[key].toUpperCase()}
          </button>
        ))}
      </div>

      {tab === "universe" && (
        <Table
          head={["HESAP", "CIHAZ", "PANEL", "BAGLAYICI", "SON ESITLEME", "ERISIM", ""]}
          rows={users.map((user) => [
            <Identity
              key="i"
              title={user.login}
              sub={user.email ?? user.name ?? ""}
              avatar={user.avatar}
            />,
            user.devices,
            user.panels,
            user.connectorKeys.length,
            when(user.lastSync),
            <Toggle
              key="t"
              on={access[user.id]?.["universe"] !== false}
              onChange={(next) => toggleAccess(user.id, "universe", next)}
            />,
            <button
              key="r"
              type="button"
              onClick={() => adminRevoke(user.id).then(load)}
              className="rounded-md border border-rose-500/30 px-2.5 py-1 font-mono text-[10px] tracking-widest text-rose-300/80 transition-colors hover:bg-rose-500/10"
            >
              oturumlari kes
            </button>,
          ])}
          empty="Henuz hesap yok."
          detail={(index) => ({
            key: users[index]!.id,
            node: <DataView app="universe" id={users[index]!.id} label={users[index]!.login} />,
          })}
        />
      )}

      {tab === "trading" &&
        (!journalReady ? (
          <Note>
            Journal veritabani bagli degil. <code className="text-violet-300">wrangler.toml</code>{" "}
            icindeki <code className="text-violet-300">JOURNAL_DB</code> binding&apos;ini kontrol
            et.
          </Note>
        ) : (
          <Table
            head={["KULLANICI", "HESAP BAGI", "ROL", "ISLEM", "NOT", "SON GIRIS", "DURUM"]}
            rows={journal.map((row) => [
              <Identity key="i" title={row.username} sub={row.displayName ?? ""} />,
              row.accountId ? (
                <span className="font-mono text-[10px] text-emerald-300/80">bagli</span>
              ) : (
                <span className="font-mono text-[10px] text-amber-300/70">bagli degil</span>
              ),
              <button
                key="role"
                type="button"
                onClick={() =>
                  patchJournal(row.id, { role: row.role === "admin" ? "user" : "admin" })
                }
                className="rounded-md border border-white/15 px-2.5 py-1 font-mono text-[10px] tracking-widest text-white/60 transition-colors hover:bg-white/5"
              >
                {row.role}
              </button>,
              row.trades,
              row.notes,
              when(row.lastLoginAt),
              <Toggle
                key="a"
                on={row.isActive}
                onChange={(next) => patchJournal(row.id, { isActive: next })}
                labelOn="aktif"
                labelOff="kapali"
              />,
            ])}
            empty="Journal kullanicisi yok."
            detail={(index) => ({
              key: journal[index]!.id,
              node: (
                <DataView app="trading" id={journal[index]!.id} label={journal[index]!.username} />
              ),
            })}
          />
        ))}

      {tab === "utility" && (
        <Table
          head={["HESAP", "E-POSTA", "KAYIT", "ERISIM"]}
          rows={users.map((user) => [
            <Identity key="i" title={user.login} sub={user.name ?? ""} avatar={user.avatar} />,
            user.email ?? "—",
            when(user.createdAt),
            <Toggle
              key="t"
              on={access[user.id]?.["utility"] !== false}
              onChange={(next) => toggleAccess(user.id, "utility", next)}
            />,
          ])}
          empty="Henuz hesap yok."
          detail={(index) => ({
            key: `utility-${users[index]!.id}`,
            node: <DataView app="utility" id={users[index]!.id} label={users[index]!.login} />,
          })}
        />
      )}
    </Frame>
  );
}

function cellText(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);

  return String(value);
}

function looksLikeJson(value: unknown): boolean {
  return typeof value === "string" && value.length > 60 && /^[[{]/.test(value.trim());
}

function DataView({ app, id, label }: { app: AppKey; id: string; label: string }) {
  const [tables, setTables] = useState<DataTable[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [failed, setFailed] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    adminInspect(app, id)
      .then((report) => {
        if (!alive) return;

        setTables(report.tables);
        setAvailable(report.available);
        setOpen(report.tables[0]?.table ?? null);
      })
      .catch((cause) => alive && setFailed(cause instanceof Error ? cause.message : "okunamadi"));

    return () => {
      alive = false;
    };
  }, [app, id]);

  if (failed) return <Note>{failed}</Note>;
  if (!available) return <Note>Bu uygulamanin veritabani bagli degil.</Note>;
  if (!tables) {
    return (
      <p className="px-4 py-4 font-mono text-[11px] tracking-widest text-white/25">OKUNUYOR...</p>
    );
  }
  if (!tables.length) return <Note>{label} icin kayitli veri yok.</Note>;

  const rowTotal = tables.reduce((sum, table) => sum + table.total, 0);

  return (
    <div className="rounded-xl border border-white/10 bg-black/30">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2.5">
        <span className="font-mono text-[10px] tracking-widest text-white/30">
          {tables.length} TABLO · {rowTotal} SATIR
        </span>

        <span className="flex-1" />

        {tables.map((table) => (
          <button
            key={table.table}
            type="button"
            onClick={() => setOpen(open === table.table ? null : table.table)}
            className={`rounded-md px-2.5 py-1 font-mono text-[10px] tracking-widest transition-colors ${
              open === table.table
                ? "bg-violet-500/20 text-white"
                : "bg-white/5 text-white/40 hover:text-white/70"
            }`}
          >
            {table.table} · {table.total}
          </button>
        ))}
      </div>

      {tables
        .filter((table) => table.table === open)
        .map((table) => (
          <div key={table.table}>
            <div className="max-h-[420px] overflow-auto">
              <table className="w-full text-[12px]">
                <thead className="sticky top-0 bg-neutral-950/95 backdrop-blur">
                  <tr className="border-b border-white/10">
                    {table.columns.map((column) => (
                      <th
                        key={column}
                        className="whitespace-nowrap px-3 py-2 text-left font-mono text-[10px] font-normal tracking-widest text-white/30"
                      >
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-white/[0.06] last:border-0 align-top"
                    >
                      {table.columns.map((column) => {
                        const value = row[column];

                        return (
                          <td key={column} className="px-3 py-2 text-white/65 tabular-nums">
                            {looksLikeJson(value) ? (
                              <details>
                                <summary className="cursor-pointer font-mono text-[10px] text-violet-300/70">
                                  JSON · {String(value).length} karakter
                                </summary>
                                <pre className="mt-1 max-w-[520px] overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-white/55">
                                  {(() => {
                                    try {
                                      return JSON.stringify(JSON.parse(String(value)), null, 2);
                                    } catch {
                                      return String(value);
                                    }
                                  })()}
                                </pre>
                              </details>
                            ) : (
                              <span
                                className="block max-w-[340px] truncate"
                                title={cellText(value)}
                              >
                                {cellText(value)}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {table.truncated ? (
              <p className="border-t border-white/10 px-3 py-2 font-mono text-[10px] tracking-widest text-amber-300/60">
                ILK 50 SATIR GOSTERILIYOR · TOPLAM {table.total}
              </p>
            ) : null}
          </div>
        ))}
    </div>
  );
}

function Identity({ title, sub, avatar }: { title: string; sub?: string; avatar?: string | null }) {
  return (
    <div className="flex items-center gap-2.5">
      {avatar ? (
        <img src={avatar} alt="" className="h-7 w-7 rounded-full border border-white/10" />
      ) : (
        <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/5 font-mono text-[10px] text-white/40">
          {title.slice(0, 2).toUpperCase()}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-white">{title}</span>
        {sub ? <span className="block truncate text-[11px] text-white/35">{sub}</span> : null}
      </span>
    </div>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] px-5 py-4 text-sm text-amber-100/80">
      {children}
    </div>
  );
}

function Table({
  head,
  rows,
  empty,
  detail,
}: {
  head: string[];
  rows: React.ReactNode[][];
  empty: string;
  detail?: (index: number) => { key: string; node: React.ReactNode };
}) {
  const [open, setOpen] = useState<string | null>(null);

  if (!rows.length) {
    return <Note>{empty}</Note>;
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-white/[0.02]">
            {head.map((cell, index) => (
              <th
                key={index}
                className="px-4 py-3 text-left font-mono text-[10px] font-normal tracking-widest text-white/30"
              >
                {cell}
              </th>
            ))}
            {detail ? <th className="w-24 px-4 py-3" /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const info = detail?.(index);
            const isOpen = Boolean(info && open === info.key);

            return (
              <Fragment key={index}>
                <tr className="border-b border-white/[0.06] last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-3 align-middle text-white/70 tabular-nums"
                    >
                      {cell}
                    </td>
                  ))}

                  {info ? (
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : info.key)}
                        className={`rounded-md border px-2.5 py-1 font-mono text-[10px] tracking-widest transition-colors ${
                          isOpen
                            ? "border-violet-400/50 bg-violet-500/15 text-violet-200"
                            : "border-white/15 text-white/45 hover:bg-white/5"
                        }`}
                      >
                        {isOpen ? "kapat" : "veri"}
                      </button>
                    </td>
                  ) : null}
                </tr>

                {info && isOpen ? (
                  <tr className="border-b border-white/[0.06]">
                    <td colSpan={row.length + 1} className="bg-black/20 px-4 py-4">
                      {info.node}
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Frame({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen bg-neutral-950 px-6 py-14 text-white/80">
      <div className="pointer-events-none fixed inset-0 opacity-[0.3] [background:radial-gradient(circle_at_50%_-10%,rgba(139,92,246,0.16),transparent_60%)]" />

      <div className={`relative z-10 mx-auto w-full ${wide ? "max-w-6xl" : "max-w-md"}`}>
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_2px_rgba(139,92,246,0.7)]" />
          <span className="font-mono text-[10px] tracking-widest text-white/40">
            REVO667 YONETIM
          </span>
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">
          Kullanici yonetimi
        </h1>

        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}

export const Route = createFileRoute("/admin")({
  component: AdminPanel,
  head: () => ({
    meta: [{ title: "667 · yönetim" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});
