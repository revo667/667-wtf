import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export function MusicToggle({ src = "/music/theme.mp3" }: { src?: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.35);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    // Ses düzeyini aşağıdaki efekt ayarlar (açılışta da çalışır).

    const tryPlay = () => {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    };
    tryPlay();

    const onFirstInteraction = () => {
      if (audio.paused) tryPlay();
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
    window.addEventListener("pointerdown", onFirstInteraction);
    window.addEventListener("keydown", onFirstInteraction);

    return () => {
      window.removeEventListener("pointerdown", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio
        .play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="auto" />
      <div className="fixed bottom-5 right-5 z-20 flex items-center gap-2 rounded-full border border-border bg-card/70 px-2.5 py-2 backdrop-blur transition-colors hover:border-border/80">
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="Ses düzeyi"
          className="h-1 w-16 cursor-pointer appearance-none rounded-full bg-muted/60 accent-primary outline-none sm:w-20"
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Müziği duraklat" : "Müziği çal"}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 text-foreground/80 transition-colors hover:border-accent hover:text-accent"
        >
          {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
      </div>
    </>
  );
}
