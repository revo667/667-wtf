import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isLoopback, me, mintDesktopToken, signInUrl, type Account } from "@/lib/account";

type Phase = "checking" | "anonymous" | "ready" | "sent" | "error";

function DesktopAuth() {
  const { redirect, state: nonce, app } = Route.useSearch();
  const appName = app || "Universe";
  const [phase, setPhase] = useState<Phase>("checking");
  const [account, setAccount] = useState<Account | null>(null);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    me()
      .then((user) => {
        setAccount(user);
        setPhase(user ? "ready" : "anonymous");
      })
      .catch(() => setPhase("anonymous"));
  }, []);

  const approve = async () => {
    try {
      const minted = await mintDesktopToken(redirect);
      setToken(minted);
      setPhase("sent");

      if (isLoopback(redirect) && nonce) {
        window.location.href = `${redirect}?token=${encodeURIComponent(minted)}&state=${encodeURIComponent(nonce)}`;
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Beklenmeyen hata");
      setPhase("error");
    }
  };

  const backHere = `/universe/auth?redirect=${encodeURIComponent(redirect ?? "")}&state=${encodeURIComponent(nonce ?? "")}&app=${encodeURIComponent(appName)}`;

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-6 text-white/80">
      <div className="pointer-events-none fixed inset-0 opacity-[0.35] [background:radial-gradient(circle_at_50%_-10%,rgba(139,92,246,0.18),transparent_60%)]" />

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_2px_rgba(139,92,246,0.7)]" />
          <span className="font-mono text-[10px] tracking-widest text-white/40">
            MASAUSTU BAGLANTISI
          </span>
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-white">
          {appName} baglantisi
        </h1>

        {phase === "checking" && (
          <p className="mt-6 font-mono text-[10px] tracking-widest text-white/30">
            KONTROL EDILIYOR...
          </p>
        )}

        {phase === "anonymous" && (
          <>
            <p className="mt-6 text-sm leading-relaxed text-white/60">
              Devam etmek icin GitHub hesabinla giris yap.
            </p>

            <a
              href={signInUrl(backHere)}
              className="mt-6 inline-flex items-center gap-3 rounded-sm border border-violet-500/50 bg-violet-500/15 px-6 py-4 font-mono text-xs tracking-widest text-violet-200 transition-colors duration-300 hover:bg-violet-500/25 hover:text-white"
            >
              GITHUB ILE GIRIS YAP
            </a>
          </>
        )}

        {phase === "ready" && account && (
          <>
            <p className="mt-6 text-sm leading-relaxed text-white/60">
              <span className="text-white">{account.login}</span> hesabina masaustu uygulamasinin
              erismesine izin veriyorsun. Uygulama acik sekmelerini ve baglayici kimliklerini
              esitleyecek.
            </p>

            <p className="mt-3 font-mono text-[10px] leading-relaxed tracking-widest text-white/25">
              TOKEN VE API ANAHTARLARIN GONDERILMEZ.
            </p>

            <button
              type="button"
              onClick={approve}
              className="mt-7 w-full rounded-sm border border-violet-500/50 bg-violet-500/15 px-6 py-4 font-mono text-xs tracking-widest text-violet-200 transition-colors duration-300 hover:bg-violet-500/25 hover:text-white"
            >
              UYGULAMAYA IZIN VER
            </button>

            {!isLoopback(redirect) && (
              <p className="mt-4 font-mono text-[10px] leading-relaxed tracking-widest text-white/30">
                UYGULAMA ADRESI ALGILANMADI - TOKEN EKRANDA GOSTERILECEK.
              </p>
            )}
          </>
        )}

        {phase === "sent" && (
          <>
            <p className="mt-6 text-sm leading-relaxed text-white/60">
              {isLoopback(redirect)
                ? "Uygulamaya donebilirsin."
                : "Bu kodu uygulamada Ayarlar > Hesap > TOKEN GIR alanina yapistir."}
            </p>

            {!isLoopback(redirect) && (
              <code className="mt-4 block rounded-sm border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-[11px] break-all text-white/70">
                {token}
              </code>
            )}
          </>
        )}

        {phase === "error" && (
          <p className="mt-6 font-mono text-[10px] tracking-widest text-rose-300/80">
            {error.toUpperCase()}
          </p>
        )}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/universe/auth")({
  component: DesktopAuth,
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search["redirect"] === "string" ? search["redirect"] : undefined,
    state: typeof search["state"] === "string" ? search["state"] : undefined,
    app: typeof search["app"] === "string" ? search["app"].slice(0, 40) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "667 · masaüstü bağlantısı" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});
