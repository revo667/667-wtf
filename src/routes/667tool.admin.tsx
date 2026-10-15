import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

type Release = {
  id: number;
  version: string;
  notes: string | null;
  mac_url: string | null;
  mac_name: string | null;
  win_url: string | null;
  win_name: string | null;
  published_at: number;
  published_by: string | null;
};
type License = {
  key_hash: string;
  label: string | null;
  note: string | null;
  created_at: number;
  revoked: number;
  last_seen: number | null;
};
type AccessEvent = {
  id: number;
  label: string | null;
  ip: string | null;
  at: number;
  event: string;
};
type State = {
  authed: boolean;
  username?: string;
  releases?: Release[];
  licenses?: License[];
  accessLog?: AccessEvent[];
};

const API = "/api/667tool-admin";

async function post(body: Record<string, unknown>) {
  const r = await fetch(API, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return {
    status: r.status,
    data: (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; key?: string },
  };
}

function fmt(ts: number) {
  return new Date(ts).toLocaleString();
}

function AdminPanel() {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const r = await fetch(API);
    setState(r.ok ? await r.json() : { authed: false });
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading) {
    return (
      <Shell>
        <p className="text-white/50">Yükleniyor…</p>
      </Shell>
    );
  }
  if (!state?.authed) {
    return <Login onDone={refresh} />;
  }
  return <Dashboard state={state} refresh={refresh} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#070708] text-white/80 selection:bg-white/20">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-56 -top-56 h-[640px] w-[640px] rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute -left-20 -top-40 h-[520px] w-[720px] -rotate-12 [background:conic-gradient(from_200deg_at_0%_0%,rgba(255,255,255,0.05),transparent_25%)] blur-2xl" />
        <div className="absolute inset-0 opacity-[0.25] [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_20%_0%,black_20%,transparent_70%)]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/50 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link
            to="/667tool"
            className="font-mono text-[10px] tracking-widest text-white/40 hover:text-white"
          >
            ← 667 TOOL
          </Link>
          <div className="flex items-center gap-2.5">
            <img src="/667-tool.png" alt="" className="size-6 rounded opacity-90" />
            <span className="text-[13px] font-medium text-white">Admin</span>
          </div>
          <span className="w-16" />
        </div>
      </header>
      <main className="relative z-10 mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}

function Glass({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_60px_-30px_rgba(0,0,0,0.8)] ${className}`}
    >
      {children}
    </div>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { status, data } = await post({ op: "login", username, secret });
    setBusy(false);
    if (status === 200 && data.ok) onDone();
    else setError((data.error as string) || "Giriş başarısız");
  }

  return (
    <Shell>
      <div className="mx-auto mt-10 max-w-sm">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">
          Admin girişi
        </h1>
        <p className="mt-2 text-sm text-white/50">667 Tool yönetim paneli.</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Kullanıcı adı"
            autoComplete="username"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
          />
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Erişim anahtarı"
            autoComplete="current-password"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none focus:border-violet-500/50"
          />
          {error && (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy || !username || !secret}
            className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-black transition-transform hover:scale-[1.01] disabled:opacity-50"
          >
            {busy ? "Giriş yapılıyor…" : "Giriş yap"}
          </button>
        </form>
      </div>
    </Shell>
  );
}

function Dashboard({ state, refresh }: { state: State; refresh: () => void }) {
  return (
    <Shell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">
            Panel
          </h1>
          <p className="mt-1 text-sm text-white/50">Hoş geldin, {state.username}.</p>
        </div>
        <button
          onClick={async () => {
            await post({ op: "logout" });
            refresh();
          }}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-sm text-white/70 hover:border-white/30 hover:text-white"
        >
          Çıkış
        </button>
      </div>

      <StatsBento state={state} />

      <PublishCard onDone={refresh} releases={state.releases ?? []} />
      <LicensesCard onChange={refresh} licenses={state.licenses ?? []} />
      <AccessLogCard log={state.accessLog ?? []} />
    </Shell>
  );
}

function StatsBento({ state }: { state: State }) {
  const licenses = state.licenses ?? [];
  const log = state.accessLog ?? [];
  const active = licenses.filter((l) => !l.revoked).length;
  const revoked = licenses.filter((l) => l.revoked).length;
  const dayAgo = Date.now() - 24 * 3600_000;
  const last24 = log.filter((e) => e.at >= dayAgo && e.event === "ok").length;
  const latest = (state.releases ?? [])[0]?.version ?? "—";

  const cards: { label: string; value: string | number; hint?: string }[] = [
    { label: "Güncel sürüm", value: latest },
    { label: "Aktif anahtar", value: active },
    { label: "İptalli", value: revoked },
    { label: "Son 24s bağlantı", value: last24 },
  ];
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <Glass key={c.label} className="p-4">
          <div className="text-xs text-white/40">{c.label}</div>
          <div className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-white">
            {c.value}
          </div>
        </Glass>
      ))}
    </div>
  );
}

function AccessLogCard({ log }: { log: AccessEvent[] }) {
  const tone: Record<string, string> = {
    ok: "text-emerald-300",
    revoked: "text-red-300",
    invalid: "text-amber-300",
  };
  const labelOf: Record<string, string> = {
    ok: "bağlandı",
    revoked: "iptalli anahtar denendi",
    invalid: "geçersiz anahtar",
  };
  return (
    <section className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
      <h2 className="text-lg font-semibold text-white">Erişim kayıtları</h2>
      <p className="mt-1 text-sm text-white/45">
        Kim, ne zaman, hangi IP'den bağlandı. Sadece erişim olayları — token, arama ya da mesaj
        içeriği yok.
      </p>
      <div className="mt-4 space-y-1.5">
        {log.length === 0 && <p className="text-sm text-white/40">Henüz kayıt yok.</p>}
        {log.map((e) => (
          <div
            key={e.id}
            className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2 text-sm"
          >
            <span className="text-white">{e.label || "—"}</span>
            <span className={`text-xs ${tone[e.event] ?? "text-white/40"}`}>
              {labelOf[e.event] ?? e.event}
            </span>
            <span className="ml-auto shrink-0 font-mono text-xs text-white/30">{e.ip || "—"}</span>
            <span className="shrink-0 text-xs text-white/30">{fmt(e.at)}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-white/45">{label}</span>
      <input
        {...props}
        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
      />
    </label>
  );
}

function PublishCard({ onDone, releases }: { onDone: () => void; releases: Release[] }) {
  const [f, setF] = useState({
    version: "",
    notes: "",
    mac_url: "",
    mac_name: "667-tool.dmg",
    win_url: "",
    win_name: "667-tool-setup.exe",
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  async function publish() {
    if (!f.version.trim()) return;
    setBusy(true);
    setMsg(null);
    const { data } = await post({ op: "publish", ...f });
    setBusy(false);
    if (data.ok) {
      setMsg("Yayınlandı ✓");
      setF({ ...f, version: "", notes: "" });
      onDone();
    } else setMsg((data.error as string) || "Hata");
  }

  return (
    <section className="mb-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
      <h2 className="text-lg font-semibold text-white">Güncelleme yayınla</h2>
      <p className="mt-1 text-sm text-white/45">
        exe/dmg dosyalarını bir yere (ör. GitHub release) yükle, indirme bağlantısını buraya gir.
        Uygulama işletim sistemine göre doğru dosyayı gösterir.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field
          label="Sürüm (ör. 2.1.0)"
          value={f.version}
          onChange={set("version")}
          placeholder="2.1.0"
        />
        <Field label="Notlar" value={f.notes} onChange={set("notes")} placeholder="Yenilikler…" />
        <Field
          label="macOS indirme URL"
          value={f.mac_url}
          onChange={set("mac_url")}
          placeholder="https://…/667-tool.dmg"
        />
        <Field label="macOS dosya adı" value={f.mac_name} onChange={set("mac_name")} />
        <Field
          label="Windows indirme URL"
          value={f.win_url}
          onChange={set("win_url")}
          placeholder="https://…/667-tool-setup.exe"
        />
        <Field label="Windows dosya adı" value={f.win_name} onChange={set("win_name")} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={publish}
          disabled={busy || !f.version.trim()}
          className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-50"
        >
          {busy ? "Yayınlanıyor…" : "Yayınla"}
        </button>
        {msg && <span className="text-sm text-white/60">{msg}</span>}
      </div>

      {releases.length > 0 && (
        <div className="mt-6 border-t border-white/[0.06] pt-4">
          <div className="mb-2 text-xs font-medium text-white/40">Son sürümler</div>
          <div className="space-y-1.5">
            {releases.slice(0, 6).map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2 text-sm"
              >
                <span className="font-mono text-violet-300">{r.version}</span>
                <span className="truncate text-white/50">{r.notes}</span>
                <span className="ml-auto shrink-0 text-xs text-white/30">
                  {fmt(r.published_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function LicensesCard({ onChange, licenses }: { onChange: () => void; licenses: License[] }) {
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [newKey, setNewKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const { data } = await post({ op: "license.create", label, note });
    setBusy(false);
    if (data.ok) {
      setNewKey(data.key as string);
      setLabel("");
      setNote("");
      onChange();
    }
  }
  async function toggle(l: License) {
    await post({ op: "license.revoke", key_hash: l.key_hash, revoked: !l.revoked });
    onChange();
  }

  return (
    <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-xl shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)]">
      <h2 className="text-lg font-semibold text-white">Lisans / erişim anahtarları</h2>
      <p className="mt-1 text-sm text-white/45">
        Anahtar üret, kullanıcıya ver. Erişimi kesmek için iptal et (ban yerine). Token, arama ya da
        mesaj içeriği <strong>saklanmaz</strong>.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block flex-1">
          <span className="mb-1 block text-xs text-white/45">Etiket (kime)</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ör. ahmet"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
          />
        </label>
        <label className="block flex-1">
          <span className="mb-1 block text-xs text-white/45">Not</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="opsiyonel"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-violet-500/50"
          />
        </label>
        <button
          onClick={create}
          disabled={busy}
          className="rounded-lg bg-violet-500 px-4 py-2 text-sm font-medium text-white hover:bg-violet-400 disabled:opacity-50"
        >
          Üret
        </button>
      </div>

      {newKey && (
        <div className="mt-3 rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2.5 text-sm">
          Yeni anahtar (yalnızca şimdi görünür):{" "}
          <code className="font-mono text-violet-200">{newKey}</code>
        </div>
      )}

      <div className="mt-5 space-y-1.5">
        {licenses.length === 0 && <p className="text-sm text-white/40">Henüz anahtar yok.</p>}
        {licenses.map((l) => (
          <div
            key={l.key_hash}
            className="flex items-center gap-3 rounded-lg bg-white/[0.02] px-3 py-2 text-sm"
          >
            <span className={l.revoked ? "text-white/30 line-through" : "text-white"}>
              {l.label || "—"}
            </span>
            {l.note && <span className="truncate text-white/40">{l.note}</span>}
            <span className="ml-auto shrink-0 text-xs text-white/30">
              {l.last_seen ? `son: ${fmt(l.last_seen)}` : "hiç kullanılmadı"}
            </span>
            <button
              onClick={() => toggle(l)}
              className={`shrink-0 rounded-md border px-2 py-1 text-xs ${
                l.revoked
                  ? "border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/10"
                  : "border-red-400/30 text-red-300 hover:bg-red-500/10"
              }`}
            >
              {l.revoked ? "Geri aç" : "İptal et"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export const Route = createFileRoute("/667tool/admin")({
  component: AdminPanel,
  head: () => ({
    meta: [{ title: "667 Tool · yönetim" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});
