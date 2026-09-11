import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError, api } from "@/panel/api";
import {
  ActionResult,
  ConfirmButton,
  buttonClass,
  inputClass,
  primaryButtonClass,
  usePanelAction,
} from "@/panel/actions";
import { BlocksEditor } from "@/panel/embed/BlocksEditor";
import { ClassicEditor } from "@/panel/embed/ClassicEditor";
import {
  GREETING_VARS,
  deepEqual,
  emptyDoc,
  mapStrings,
  newEmbed,
  normalize,
  parseMessageLink,
  sampleFill,
  type Doc,
  type Mode,
} from "@/panel/embed/doc";
import { MessagePreview } from "@/panel/embed/Preview";
import { useMeta } from "@/panel/hooks";
import { useSession } from "@/panel/session";
import { Card, Notice, Segmented, Toggle, selectClass } from "@/panel/ui";

type Target = "yeni" | "duzenle" | "karsilama" | "ayrilma";
type EmbedSearch = { hedef?: Target; kanal?: string; mesaj?: string };
type MsgRef = { channel: string; message: string };

const TARGETS: { value: Target; label: string }[] = [
  { value: "yeni", label: "Yeni mesaj" },
  { value: "duzenle", label: "Gönderilmişi düzenle" },
  { value: "karsilama", label: "Karşılama mesajı" },
  { value: "ayrilma", label: "Ayrılma mesajı" },
];

const snowflake = (v: unknown) => (typeof v === "string" && /^\d{15,21}$/.test(v) ? v : undefined);

export const Route = createFileRoute("/panel/embed")({
  validateSearch: (raw: Record<string, unknown>): EmbedSearch => {
    const out: EmbedSearch = {};
    const hedef = TARGETS.find((t) => t.value === raw["hedef"])?.value;
    if (hedef) out.hedef = hedef;
    const kanal = snowflake(raw["kanal"]);
    const mesaj = snowflake(raw["mesaj"]);
    if (kanal && mesaj) {
      out.hedef = "duzenle";
      out.kanal = kanal;
      out.mesaj = mesaj;
    }
    return out;
  },
  component: EmbedPage,
});

// Taslaklar sekme ya da sayfa değişince kaybolmasın. Sadece bellekte: sayfa yenilenince gider.
const drafts = new Map<string, Doc>();
let lastEdited: MsgRef | null = null;

function useDraft(key: string, init: () => Doc) {
  const [doc, setDoc] = useState<Doc>(() => drafts.get(key) ?? init());
  const update = (d: Doc) => {
    drafts.set(key, d);
    setDoc(d);
  };
  return [doc, update] as const;
}

const MESSAGE_KINDS = ["text", "announcement", "voice", "stage"];

function useBotIdentity() {
  const q = useQuery({
    queryKey: ["panel", "bot"],
    queryFn: () => api<{ user: { name: string; avatar: string } }>("GET", "/bot"),
  });
  return { name: q.data?.user.name ?? "bot", avatar: q.data?.user.avatar ?? null };
}

function EmbedPage() {
  const session = useSession();
  if (session.level === "mod") {
    return (
      <Card>
        <Notice empty="Embed sekmesi admin ve owner içindir." />
      </Card>
    );
  }
  return <EmbedStudio />;
}

function EmbedStudio() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const target = search.hedef ?? "yeni";
  const go = (hedef: Target, ref?: MsgRef) =>
    navigate({ search: ref ? { hedef, kanal: ref.channel, mesaj: ref.message } : { hedef } });
  const ref: MsgRef | null =
    search.kanal && search.mesaj ? { channel: search.kanal, message: search.mesaj } : lastEdited;

  return (
    <div className="space-y-4">
      <Segmented value={target} options={TARGETS} onChange={(t) => go(t)} label="Embed hedefi" />
      {target === "yeni" && <NewMessage onEdit={(r) => go("duzenle", r)} />}
      {target === "duzenle" && (
        <EditMessage
          key={ref ? `${ref.channel}-${ref.message}` : "bos"}
          target={ref}
          onLoad={(r) => go("duzenle", r)}
        />
      )}
      {target === "karsilama" && <GreetingDesign kind="welcome" />}
      {target === "ayrilma" && <GreetingDesign kind="leave" />}
    </div>
  );
}

const MODES: { value: Mode; title: string; text: string }[] = [
  {
    value: "embed",
    title: "Klasik embed",
    text: "Yazar, başlık, açıklama, yan yana alanlar, alt bilgi ve zaman. Görselin yeri sabit: küçük görsel sağ üstte, büyük görsel altta. 10 embed'e kadar.",
  },
  {
    value: "blocks",
    title: "Blok düzeni",
    text: "Discord'un yeni mesaj düzeni. Görsel yazının üstünde, altında ya da sağında; galeri, ayraç ve butonlar istediğin sırada.",
  },
];

function ModePicker({
  mode,
  onChange,
  locked,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  locked: boolean;
}) {
  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label="Mesaj biçimi" className="grid gap-2 sm:grid-cols-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            role="radio"
            aria-checked={mode === m.value}
            disabled={locked && mode !== m.value}
            onClick={() => onChange(m.value)}
            className={`rounded-lg border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              mode === m.value
                ? "border-accent bg-primary/15"
                : "border-border hover:border-accent/60"
            }`}
          >
            <span className="block text-sm font-medium text-foreground">{m.title}</span>
            <span className="mt-1 block text-xs text-muted-foreground">{m.text}</span>
          </button>
        ))}
      </div>
      {locked && (
        <p className="text-xs text-muted-foreground">
          Discord gönderilmiş bir mesajın biçimini değiştirmeye izin vermiyor.
        </p>
      )}
    </div>
  );
}

/** Editör (solda) ve Discord önizlemesi (sağda, kayarken sabit). */
function Studio({
  doc,
  onChange,
  top,
  actions,
  vars = false,
  lockMode = false,
}: {
  doc: Doc;
  onChange: (d: Doc) => void;
  top: ReactNode;
  actions: ReactNode;
  vars?: boolean;
  lockMode?: boolean;
}) {
  const meta = useMeta();
  const bot = useBotIdentity();
  const shown = vars ? mapStrings(doc, sampleFill) : doc;
  return (
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,34rem)]">
      <div className="min-w-0 space-y-4">
        {top}
        <Card title="Biçim">
          <ModePicker
            mode={doc.mode}
            onChange={(mode) => onChange({ ...doc, mode })}
            locked={lockMode}
          />
        </Card>
        {doc.mode === "embed" ? (
          <ClassicEditor doc={doc} onChange={onChange} vars={vars} />
        ) : (
          <BlocksEditor doc={doc} onChange={onChange} vars={vars} />
        )}
      </div>
      <div className="min-w-0 space-y-3 xl:sticky xl:top-20 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
        <p className="text-xs text-muted-foreground">
          Önizleme{vars && " · değişkenler örnek değerlerle"}
        </p>
        <MessagePreview doc={shown} meta={meta.data} bot={bot} />
        {actions}
      </div>
    </div>
  );
}

const actionsClass =
  "flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/70 p-4";

function NewMessage({ onEdit }: { onEdit: (r: MsgRef) => void }) {
  const meta = useMeta();
  const channels = (meta.data?.channels ?? []).filter((c) => MESSAGE_KINDS.includes(c.kind));
  const [doc, setDoc] = useDraft("yeni", emptyDoc);
  const [channel, setChannel] = useState("");
  const [allow, setAllow] = useState(false);
  const [sent, setSent] = useState<MsgRef | null>(null);
  const send = usePanelAction(
    async () => {
      const r = await api<{ id: string }>("POST", "/embeds/send", {
        channel_id: channel,
        doc,
        allow_mentions: allow,
      });
      setSent({ channel, message: r.id });
    },
    { success: "Mesaj gönderildi" },
  );

  return (
    <Studio
      doc={doc}
      onChange={setDoc}
      top={
        <Card title="Nereye">
          <div className="flex flex-wrap items-center gap-4">
            <select
              aria-label="Kanal"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className={`${selectClass} min-w-56`}
            >
              <option value="">Kanal seç…</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>
                  #{c.name}
                </option>
              ))}
            </select>
            <Toggle
              checked={allow}
              onChange={setAllow}
              label="Kullanıcı ve rol etiketleri bildirim göndersin"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            @everyone ve @here hiçbir zaman etiketlenmez.
          </p>
        </Card>
      }
      actions={
        <div className={actionsClass}>
          <button
            type="button"
            disabled={!channel || send.busy}
            onClick={() => send.run(undefined)}
            className={primaryButtonClass}
          >
            Gönder
          </button>
          <ConfirmButton
            label="Temizle"
            confirmText="Tasarım sıfırlansın mı?"
            danger={false}
            onConfirm={() => setDoc(emptyDoc())}
          />
          {sent && (
            <button type="button" onClick={() => onEdit(sent)} className={buttonClass}>
              Gönderileni düzenle
            </button>
          )}
          <ActionResult msg={send.msg} />
        </div>
      }
    />
  );
}

function EditMessage({ target, onLoad }: { target: MsgRef | null; onLoad: (r: MsgRef) => void }) {
  const meta = useMeta();
  const [input, setInput] = useState(target ? `${target.channel}-${target.message}` : "");
  const parsed = parseMessageLink(input);
  const q = useQuery({
    queryKey: ["panel", "embed-message", target?.channel, target?.message],
    queryFn: () =>
      api<{ doc: Doc }>("GET", `/embeds/messages/${target?.channel}/${target?.message}`),
    enabled: target !== null,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  useEffect(() => {
    if (target) lastEdited = target;
  }, [target]);
  const channelName = meta.data?.channels.find((c) => c.id === target?.channel)?.name;

  const top = (
    <Card title="Düzenlenecek mesaj">
      <div className="flex flex-wrap gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && parsed && onLoad(parsed)}
          placeholder="mesaj bağlantısı (Discord'da mesaja sağ tık › Mesaj Bağlantısını Kopyala)"
          className={`${inputClass} min-w-64 flex-1`}
        />
        <button
          type="button"
          disabled={!parsed}
          onClick={() => parsed && onLoad(parsed)}
          className={buttonClass}
        >
          Yükle
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Sadece botun gönderdiği mesajlar düzenlenebilir. Rol paneli mesajları Bot › Rol
        panelleri'nden düzenlenir. Mesajlar sayfasında botun mesajlarındaki "düzenle" de buraya
        getirir.
      </p>
      {q.error && (
        <p className="mt-2 text-sm text-destructive">
          {q.error instanceof ApiError ? q.error.message : "Mesaj yüklenemedi"}
        </p>
      )}
      {target && q.data && (
        <p className="mt-2 text-xs text-accent">
          #{channelName ?? target.channel} · {target.message} yüklendi
        </p>
      )}
    </Card>
  );

  if (!target || !q.data) {
    return (
      <div className="space-y-4">
        {top}
        {q.isFetching && (
          <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>
        )}
      </div>
    );
  }
  return <EditStudio target={target} initial={normalize(q.data.doc)} top={top} />;
}

function EditStudio({ target, initial, top }: { target: MsgRef; initial: Doc; top: ReactNode }) {
  const [doc, setDoc] = useDraft(`duzenle:${target.channel}:${target.message}`, () => initial);
  const [allow, setAllow] = useState(false);
  const dirty = !deepEqual(doc, initial);
  const save = usePanelAction(
    () =>
      api("PATCH", `/embeds/messages/${target.channel}/${target.message}`, {
        doc,
        allow_mentions: allow,
      }),
    { success: "Mesaj Discord'da güncellendi" },
  );
  return (
    <Studio
      doc={doc}
      onChange={setDoc}
      lockMode
      top={top}
      actions={
        <div className={actionsClass}>
          <button
            type="button"
            disabled={save.busy}
            onClick={() => save.run(undefined)}
            className={primaryButtonClass}
          >
            Discord'da güncelle
          </button>
          {dirty && (
            <ConfirmButton
              label="Değişiklikleri geri al"
              confirmText="Mesajın Discord'daki haline dönülsün mü?"
              danger={false}
              onConfirm={() => setDoc(initial)}
            />
          )}
          <Toggle checked={allow} onChange={setAllow} label="Etiketler bildirim göndersin" />
          <ActionResult msg={save.msg} />
        </div>
      }
    />
  );
}

interface GreetingSaved {
  enabled: boolean;
  channel_id: string | null;
  message: string;
  embed: boolean;
  color: number;
  design: Doc | null;
}

function GreetingDesign({ kind }: { kind: "welcome" | "leave" }) {
  const q = useQuery({
    queryKey: ["panel", "automation"],
    queryFn: () => api<{ welcome: GreetingSaved; leave: GreetingSaved }>("GET", "/automation"),
  });
  if (q.error) {
    return (
      <Card>
        <Notice error={q.error} />
      </Card>
    );
  }
  if (!q.data) return <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>;
  return <GreetingStudio key={kind} kind={kind} greeting={q.data[kind]} />;
}

/** Tasarım yoksa otomasyondaki düz mesajdan başlanır. */
function seed(g: GreetingSaved): Doc {
  if (g.design) return normalize(g.design);
  const doc = emptyDoc();
  if (g.embed) doc.embeds = [{ ...newEmbed(), description: g.message, color: g.color }];
  else {
    doc.content = g.message;
    doc.embeds = [];
  }
  return doc;
}

function GreetingStudio({
  kind,
  greeting,
}: {
  kind: "welcome" | "leave";
  greeting: GreetingSaved;
}) {
  const meta = useMeta();
  const [doc, setDoc] = useDraft(kind === "welcome" ? "karsilama" : "ayrilma", () =>
    seed(greeting),
  );
  const dirty = !greeting.design || !deepEqual(doc, normalize(greeting.design));
  const channelName = meta.data?.channels.find((c) => c.id === greeting.channel_id)?.name;
  const save = usePanelAction(() => api("PUT", `/embeds/greetings/${kind}`, { doc }), {
    success: "Tasarım kaydedildi",
  });
  const remove = usePanelAction(() => api("PUT", `/embeds/greetings/${kind}`, { doc: null }), {
    success: "Tasarım kaldırıldı; otomasyondaki düz mesaj gidecek",
  });
  const test = usePanelAction(() => api("POST", "/automation/test", { kind }), {
    success: "Önizleme kanala gönderildi",
  });
  const title = kind === "welcome" ? "Karşılama mesajı" : "Ayrılma mesajı";

  return (
    <Studio
      doc={doc}
      onChange={setDoc}
      vars
      top={
        <Card title={title}>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              {greeting.enabled ? "Açık" : "Kapalı"} ·{" "}
              {greeting.channel_id ? `#${channelName ?? greeting.channel_id}` : "kanal seçilmemiş"}{" "}
              ·{" "}
              <Link to="/panel/otomasyon" className="text-accent hover:underline">
                açıp kapatmak ve kanal seçmek Otomasyon'da
              </Link>
            </p>
            <p className={greeting.design ? "text-foreground" : "text-muted-foreground"}>
              {greeting.design
                ? "Bu tasarım kullanılıyor."
                : "Henüz tasarım yok; şu an otomasyondaki düz mesaj gidiyor. Kaydedince bu tasarım kullanılır."}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {GREETING_VARS.map((v) => (
                <span
                  key={v.key}
                  className="rounded-full border border-border px-2 py-0.5 text-xs"
                  title={v.label}
                >
                  <code className="text-accent">{v.key}</code>{" "}
                  <span className="text-muted-foreground">{v.label}</span>
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {"{user}"} sadece o üyeye bildirim gönderir; rol ve @everyone asla. Başlık, yazar ve
              alt bilgide etiket düz yazı görünür. {"{avatar}"} ve {"{server_icon}"} görsel
              alanlarına yazılır.
            </p>
          </div>
        </Card>
      }
      actions={
        <div className={actionsClass}>
          <button
            type="button"
            disabled={!dirty || save.busy}
            onClick={() => save.run(undefined)}
            className={primaryButtonClass}
          >
            Kaydet
          </button>
          {greeting.design && (
            <ConfirmButton
              label="Tasarımı kaldır"
              confirmText="Düz mesaja dönülsün mü?"
              busy={remove.busy}
              onConfirm={() => remove.run(undefined)}
            />
          )}
          <button
            type="button"
            disabled={dirty || !greeting.channel_id || test.busy}
            onClick={() => test.run(undefined)}
            className={buttonClass}
          >
            Kanala önizleme gönder
          </button>
          <span className="text-xs text-muted-foreground">
            {dirty
              ? "Önizleme için önce kaydet"
              : !greeting.channel_id
                ? "Otomasyon'da kanal seç"
                : "Üye yerine bot kullanılır"}
          </span>
          <ActionResult msg={save.msg ?? remove.msg ?? test.msg} />
        </div>
      }
    />
  );
}
