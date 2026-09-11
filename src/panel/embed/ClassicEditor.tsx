import { useState } from "react";
import { Plus } from "lucide-react";
import { buttonClass, inputClass } from "../actions";
import { Card, Toggle, selectClass } from "../ui";
import { LIMITS, embedChars, hex, newEmbed, type Doc, type Embed, type Field } from "./doc";
import {
  ButtonsEditor,
  ColorField,
  Group,
  ItemControls,
  TextField,
  UrlField,
  hintClass,
  move,
} from "./parts";
import { TextEditor } from "./TextEditor";

/** Klasik embed: üstte düz metin, 10'a kadar embed, altta bağlantı butonları. */
export function ClassicEditor({
  doc,
  onChange,
  vars,
}: {
  doc: Doc;
  onChange: (d: Doc) => void;
  vars: boolean;
}) {
  const [active, setActive] = useState(0);
  const idx = Math.max(0, Math.min(active, doc.embeds.length - 1));
  const current = doc.embeds[idx];
  const total = doc.embeds.reduce((n, e) => n + embedChars(e), 0);
  const setEmbeds = (embeds: Embed[]) => onChange({ ...doc, embeds });

  return (
    <>
      <Card title="Mesaj metni">
        <TextEditor
          value={doc.content}
          onChange={(content) => onChange({ ...doc, content })}
          max={LIMITS.content}
          rows={3}
          vars={vars}
          placeholder="Embed'in üstünde görünen düz yazı (isteğe bağlı)"
        />
      </Card>

      <Card
        title="Embed'ler"
        action={
          <span
            className={`text-xs tabular-nums ${total > LIMITS.embedTotal ? "text-destructive" : "text-muted-foreground"}`}
            title="Discord bir mesajdaki tüm embed yazılarının toplamını 6000 karakterle sınırlar"
          >
            toplam {total}/{LIMITS.embedTotal}
          </span>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {doc.embeds.map((e, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActive(i)}
              aria-pressed={i === idx}
              className={`inline-flex h-8 max-w-48 items-center gap-2 rounded-full border px-3 text-xs transition-colors ${i === idx ? "border-accent bg-primary/15 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full border border-border"
                style={{ backgroundColor: e.color === null ? "transparent" : hex(e.color) }}
              />
              <span className="truncate">
                {i + 1}. {e.title.trim() || e.author_name.trim() || "embed"}
              </span>
            </button>
          ))}
          {doc.embeds.length < LIMITS.embeds && (
            <button
              type="button"
              onClick={() => {
                setEmbeds([...doc.embeds, newEmbed()]);
                setActive(doc.embeds.length);
              }}
              className={buttonClass}
            >
              <Plus className="h-3.5 w-3.5" /> embed ekle
            </button>
          )}
          {current && (
            <span className="ml-auto">
              <ItemControls
                what="Embed'i"
                index={idx}
                length={doc.embeds.length}
                onMove={(to) => {
                  setEmbeds(move(doc.embeds, idx, to));
                  setActive(to);
                }}
                onDuplicate={
                  doc.embeds.length < LIMITS.embeds
                    ? () => {
                        setEmbeds([
                          ...doc.embeds.slice(0, idx + 1),
                          structuredClone(current),
                          ...doc.embeds.slice(idx + 1),
                        ]);
                        setActive(idx + 1);
                      }
                    : undefined
                }
                onRemove={() => {
                  setEmbeds(doc.embeds.filter((_, j) => j !== idx));
                  setActive(Math.max(0, idx - 1));
                }}
              />
            </span>
          )}
        </div>
        {current ? (
          <EmbedEditor
            key={idx}
            embed={current}
            onChange={(e) => setEmbeds(doc.embeds.map((x, j) => (j === idx ? e : x)))}
            vars={vars}
          />
        ) : (
          <p className={hintClass}>Embed yok; mesaj sadece metin olarak gider.</p>
        )}
      </Card>

      <Card title="Bağlantı butonları">
        <ButtonsEditor
          buttons={doc.buttons}
          onChange={(buttons) => onChange({ ...doc, buttons })}
          max={LIMITS.buttons}
          vars={vars}
        />
      </Card>
    </>
  );
}

type TsMode = "none" | "now" | "custom";

const pad = (n: number) => String(n).padStart(2, "0");
function isoToLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function EmbedEditor({
  embed: e,
  onChange,
  vars,
}: {
  embed: Embed;
  onChange: (e: Embed) => void;
  vars: boolean;
}) {
  const set = (patch: Partial<Embed>) => onChange({ ...e, ...patch });
  const ts: TsMode = e.timestamp === "" ? "none" : e.timestamp === "now" ? "now" : "custom";

  return (
    <div className="space-y-4">
      <ColorField label="Kenar rengi" value={e.color} onChange={(color) => set({ color })} />

      <Group
        title="Yazar"
        hint="Başlığın üstündeki küçük satır; ikon adın solunda yuvarlak görünür."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Ad"
            value={e.author_name}
            onChange={(author_name) => set({ author_name })}
            max={LIMITS.author}
          />
          <UrlField
            label="Bağlantı"
            value={e.author_url}
            onChange={(author_url) => set({ author_url })}
          />
        </div>
        <UrlField
          label="İkon"
          value={e.author_icon}
          onChange={(author_icon) => set({ author_icon })}
          vars={vars}
        />
      </Group>

      <Group title="Başlık">
        <TextField
          label="Başlık"
          value={e.title}
          onChange={(title) => set({ title })}
          max={LIMITS.title}
        />
        <UrlField
          label="Başlık bağlantısı"
          value={e.url}
          onChange={(url) => set({ url })}
          hint="Doluysa başlık mavi görünür ve tıklanınca açılır."
        />
      </Group>

      <Group title="Açıklama">
        <TextEditor
          value={e.description}
          onChange={(description) => set({ description })}
          max={LIMITS.description}
          rows={6}
          vars={vars}
          placeholder="Embed'in ana yazısı"
        />
      </Group>

      <Group title={`Alanlar · ${e.fields.length}/${LIMITS.fields}`}>
        <FieldsEditor fields={e.fields} onChange={(fields) => set({ fields })} vars={vars} />
      </Group>

      <Group
        title="Görseller"
        hint="Discord klasik embed'de görselin yeri sabittir: küçük görsel sağ üstte, büyük görsel en altta durur; sola görsel konamaz. Görseli yazının üstüne ya da istediğin yere koymak için Blok düzenine geç."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <UrlField
            label={<SlotLabel slot="thumb" text="Küçük görsel · sağ üstte" />}
            value={e.thumbnail}
            onChange={(thumbnail) => set({ thumbnail })}
            vars={vars}
          />
          <UrlField
            label={<SlotLabel slot="image" text="Büyük görsel · en altta" />}
            value={e.image}
            onChange={(image) => set({ image })}
            vars={vars}
          />
        </div>
      </Group>

      <Group title="Alt bilgi">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Yazı"
            value={e.footer_text}
            onChange={(footer_text) => set({ footer_text })}
            max={LIMITS.footer}
          />
          <UrlField
            label="İkon"
            value={e.footer_icon}
            onChange={(footer_icon) => set({ footer_icon })}
            vars={vars}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Zaman</span>
          <select
            value={ts}
            onChange={(ev) => {
              const mode = ev.target.value as TsMode;
              set({
                timestamp: mode === "none" ? "" : mode === "now" ? "now" : new Date().toISOString(),
              });
            }}
            className={selectClass}
          >
            <option value="none">yok</option>
            <option value="now">gönderildiği an</option>
            <option value="custom">tarih seç</option>
          </select>
          {ts === "custom" && (
            <input
              type="datetime-local"
              value={isoToLocal(e.timestamp)}
              onChange={(ev) => {
                const d = new Date(ev.target.value);
                if (!Number.isNaN(d.getTime())) set({ timestamp: d.toISOString() });
              }}
              className={`${inputClass} w-auto`}
            />
          )}
        </div>
      </Group>
    </div>
  );
}

/** Görselin embed'deki yerini gösteren küçük şema. */
function SlotLabel({ slot, text }: { slot: "thumb" | "image"; text: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        aria-hidden="true"
        className="relative inline-block h-5 w-6 rounded-sm border border-muted-foreground/60"
      >
        {slot === "thumb" ? (
          <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-[1px] bg-accent" />
        ) : (
          <span className="absolute right-0.5 bottom-0.5 left-0.5 h-2 rounded-[1px] bg-accent" />
        )}
      </span>
      {text}
    </span>
  );
}

function FieldsEditor({
  fields,
  onChange,
  vars,
}: {
  fields: Field[];
  onChange: (f: Field[]) => void;
  vars: boolean;
}) {
  const set = (i: number, patch: Partial<Field>) =>
    onChange(fields.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <div className="space-y-3">
      {fields.map((f, i) => (
        <div key={i} className="space-y-2 rounded-lg bg-background/40 p-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <TextField
                label={`${i + 1}. alan adı`}
                value={f.name}
                onChange={(name) => set(i, { name })}
                max={LIMITS.fieldName}
              />
            </div>
            <ItemControls
              what="Alanı"
              index={i}
              length={fields.length}
              onMove={(to) => onChange(move(fields, i, to))}
              onDuplicate={
                fields.length < LIMITS.fields
                  ? () => onChange([...fields.slice(0, i + 1), { ...f }, ...fields.slice(i + 1)])
                  : undefined
              }
              onRemove={() => onChange(fields.filter((_, j) => j !== i))}
            />
          </div>
          <TextEditor
            value={f.value}
            onChange={(value) => set(i, { value })}
            max={LIMITS.fieldValue}
            rows={2}
            compact
            vars={vars}
            placeholder="değer"
          />
          <Toggle
            checked={f.inline}
            onChange={(inline) => set(i, { inline })}
            label="Yan yana (satırda 3 alan; küçük görsel varsa 2)"
          />
        </div>
      ))}
      {fields.length < LIMITS.fields && (
        <button
          type="button"
          onClick={() => onChange([...fields, { name: "", value: "", inline: false }])}
          className={buttonClass}
        >
          <Plus className="h-3.5 w-3.5" /> alan ekle
        </button>
      )}
    </div>
  );
}
