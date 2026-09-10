import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, KeyRound, User } from "lucide-react";
import { Clock } from "@/components/Clock";
import { api, ApiError, setBind, type LoginResult, type Session } from "./api";

const TOKEN_LENGTH = 86;

type Step = { kind: "username" } | { kind: "token"; expiresAt: number };

export function Login({ onSuccess }: { onSuccess: (s: Session) => void }) {
  const [step, setStep] = useState<Step>({ kind: "username" });
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [step.kind, busy]);

  useEffect(() => {
    if (step.kind !== "token") return;
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, [step.kind]);

  const isToken = step.kind === "token";
  const remaining = isToken ? Math.max(0, step.expiresAt - now) : 0;
  const expired = isToken && remaining === 0;

  async function submit(raw: string) {
    const v = raw.trim();
    if (!v || busy || expired) return;
    setBusy(true);
    setError(null);
    try {
      if (step.kind === "username") {
        const r = await api<{ ttl_seconds: number }>("POST", "/auth/start", {
          username: v.toLowerCase(),
        });
        setValue("");
        setNow(Date.now());
        setStep({ kind: "token", expiresAt: Date.now() + r.ttl_seconds * 1000 });
      } else {
        const { bind, ...session } = await api<LoginResult>("POST", "/auth/verify", { token: v });
        setBind(bind);
        onSuccess({ ...session, startedAt: Date.now() });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Beklenmeyen hata");
      if (step.kind === "token") setValue("");
    } finally {
      setBusy(false);
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit(value);
  };

  const onChange = (v: string) => {
    setValue(v);
    // Anahtar tam yapıştırılınca beklemeden gönder.
    if (isToken && v.trim().length === TOKEN_LENGTH) void submit(v);
  };

  const back = () => {
    setStep({ kind: "username" });
    setValue("");
    setError(null);
  };

  const mm = Math.floor(remaining / 60_000);
  const ss = String(Math.floor((remaining % 60_000) / 1000)).padStart(2, "0");
  const Icon = isToken ? KeyRound : User;

  return (
    <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
      <Clock />

      <section className="flex flex-col items-center text-center animate-fade-in-up">
        <h1 className="glow-text animate-glow-pulse cursor-default select-none font-display font-bold text-[18vw] leading-none tracking-tighter text-foreground transition-transform duration-300 ease-out hover:glow-text-hover hover:scale-[1.02] sm:text-[10rem]">
          667
        </h1>
        <p className="mt-3 text-xs tracking-[0.5em] text-muted-foreground uppercase sm:text-sm">
          {isToken ? "telegram anahtarı" : "panel"}
        </p>

        <form onSubmit={onSubmit} className="mt-10 w-[min(24rem,86vw)]" autoComplete="off">
          <label className="flex items-center gap-3 rounded-full border border-border bg-card/70 py-2 pr-2 pl-4 backdrop-blur transition-colors focus-within:border-accent">
            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">{isToken ? "Giriş anahtarı" : "Kullanıcı adı"}</span>
            <input
              ref={inputRef}
              key={step.kind}
              type={isToken ? "password" : "text"}
              name={isToken ? "one-time-key" : "username"}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              maxLength={isToken ? 128 : 32}
              autoComplete={isToken ? "one-time-code" : "off"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              disabled={busy || expired}
              placeholder={isToken ? "anahtarı yapıştır" : "kullanıcı adı"}
              className="min-w-0 flex-1 bg-transparent text-sm tracking-widest text-foreground outline-none placeholder:text-muted-foreground/50 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || expired || !value.trim()}
              aria-label="Devam"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-background/60 text-foreground/80 transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-40"
            >
              {busy ? (
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
              ) : (
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </label>
        </form>

        {isToken && (
          <div className="mt-5 flex flex-col items-center gap-3 text-xs text-muted-foreground">
            <p className="max-w-xs leading-relaxed">
              Kullanıcı adı tanımlıysa Telegram'a tek kullanımlık bir anahtar gönderildi.
            </p>
            <span
              className={`font-mono tabular-nums tracking-widest ${expired ? "text-destructive" : ""}`}
            >
              {expired ? "süre doldu" : `${mm}:${ss}`}
            </span>
            <button
              type="button"
              onClick={back}
              className="story-link inline-flex items-center gap-1.5 tracking-[0.3em] uppercase transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-3 w-3" aria-hidden="true" /> geri
            </button>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 max-w-xs text-xs text-destructive">
            {error}
          </p>
        )}
      </section>

      <footer className="pointer-events-none fixed bottom-6 left-1/2 z-20 -translate-x-1/2 animate-fade-in-up">
        <span className="text-[10px] font-light tracking-[0.3em] text-muted-foreground/40">
          2026 — panel.667.wtf
        </span>
      </footer>
    </main>
  );
}
