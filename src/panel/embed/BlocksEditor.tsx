import {
  GalleryHorizontal,
  Link2,
  PanelBottom,
  PanelLeft,
  PanelRight,
  PanelTop,
  Plus,
  SeparatorHorizontal,
  Type,
  type LucideIcon,
} from "lucide-react";
import { buttonClass, inputClass } from "../actions";
import { Card, Segmented, Toggle } from "../ui";
import {
  LIMITS,
  blockStats,
  newBlock,
  newMedia,
  type Block,
  type Doc,
  type ImagePos,
  type Media,
} from "./doc";
import { ButtonsEditor, ColorField, ItemControls, UrlField, hintClass, move } from "./parts";
import { TextEditor } from "./TextEditor";

const KINDS: { kind: Block["kind"]; label: string; icon: LucideIcon }[] = [
  { kind: "text", label: "Yazı", icon: Type },
  { kind: "gallery", label: "Galeri", icon: GalleryHorizontal },
  { kind: "separator", label: "Ayraç", icon: SeparatorHorizontal },
  { kind: "buttons", label: "Butonlar", icon: Link2 },
];

/** Discord'un blok düzeni (Components V2): yazı, görsel, galeri, ayraç ve buton blokları. */
export function BlocksEditor({
  doc,
  onChange,
  vars,
  noButtons = false,
}: {
  doc: Doc;
  onChange: (d: Doc) => void;
  vars: boolean;
  /** Rol panelinde butonlar rollerdir; buton bloğu eklenemez. */
  noButtons?: boolean;
}) {
  const stats = blockStats(doc);
  const setBlocks = (blocks: Block[]) => onChange({ ...doc, blocks });
  const over = stats.components > LIMITS.components || stats.text > LIMITS.blockText;
  const kinds = noButtons ? KINDS.filter((k) => k.kind !== "buttons") : KINDS;

  return (
    <>
      <Card title="Çerçeve">
        <div className="space-y-4">
          <Toggle
            checked={doc.container}
            onChange={(container) => onChange({ ...doc, container })}
            label="Blokları renkli kenarlı bir çerçeveye al (embed gibi görünür)"
          />
          {doc.container && (
            <ColorField
              label="Kenar rengi"
              value={doc.accent}
              onChange={(accent) => onChange({ ...doc, accent })}
            />
          )}
        </div>
      </Card>

      <Card
        title="Bloklar"
        action={
          <span
            className={`text-xs tabular-nums ${over ? "text-destructive" : "text-muted-foreground"}`}
            title="Discord bir mesajda en fazla 40 bileşen ve toplam 4000 karakter yazıya izin verir"
          >
            bileşen {stats.components}/{LIMITS.components} · yazı {stats.text}/{LIMITS.blockText}
          </span>
        }
      >
        <div className="space-y-3">
          {doc.blocks.map((b, i) => (
            <div key={i} className="space-y-3 rounded-lg border border-border/70 p-3">
              <header className="flex items-center gap-2">
                <span className="text-[11px] tracking-wider text-muted-foreground uppercase">
                  {i + 1}. {KINDS.find((k) => k.kind === b.kind)?.label}
                </span>
                <span className="ml-auto">
                  <ItemControls
                    what="Bloğu"
                    index={i}
                    length={doc.blocks.length}
                    onMove={(to) => setBlocks(move(doc.blocks, i, to))}
                    onDuplicate={() =>
                      setBlocks([
                        ...doc.blocks.slice(0, i + 1),
                        structuredClone(b),
                        ...doc.blocks.slice(i + 1),
                      ])
                    }
                    onRemove={() => setBlocks(doc.blocks.filter((_, j) => j !== i))}
                  />
                </span>
              </header>
              <BlockBody
                block={b}
                vars={vars}
                onChange={(nb) => setBlocks(doc.blocks.map((x, j) => (j === i ? nb : x)))}
              />
            </div>
          ))}
          {doc.blocks.length === 0 && <p className={hintClass}>Henüz blok yok.</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            {kinds.map((k) => (
              <button
                key={k.kind}
                type="button"
                onClick={() => setBlocks([...doc.blocks, newBlock(k.kind)])}
                className={buttonClass}
              >
                <Plus className="h-3.5 w-3.5" />
                <k.icon className="h-3.5 w-3.5" /> {k.label}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}

function BlockBody({
  block,
  onChange,
  vars,
}: {
  block: Block;
  onChange: (b: Block) => void;
  vars: boolean;
}) {
  switch (block.kind) {
    case "text":
      return <TextBlock block={block} onChange={onChange} vars={vars} />;
    case "gallery":
      return (
        <GalleryBlock
          items={block.items}
          onChange={(items) => onChange({ ...block, items })}
          vars={vars}
        />
      );
    case "separator":
      return (
        <div className="flex flex-wrap items-center gap-4">
          <Toggle
            checked={block.divider}
            onChange={(divider) => onChange({ ...block, divider })}
            label="Çizgi göster"
          />
          <Segmented<"small" | "large">
            label="Boşluk"
            value={block.large ? "large" : "small"}
            onChange={(v) => onChange({ ...block, large: v === "large" })}
            options={[
              { value: "small", label: "küçük boşluk" },
              { value: "large", label: "büyük boşluk" },
            ]}
          />
        </div>
      );
    case "buttons":
      return (
        <ButtonsEditor
          buttons={block.buttons}
          onChange={(buttons) => onChange({ ...block, buttons })}
          max={5}
          vars={vars}
        />
      );
  }
}

const POSITIONS: {
  value: ImagePos | "left";
  label: string;
  icon: LucideIcon;
  hint: string;
}[] = [
  { value: "left", label: "Solda", icon: PanelLeft, hint: "Discord görseli yazının soluna koymaz" },
  { value: "right", label: "Sağda", icon: PanelRight, hint: "Yazının yanında küçük kare görsel" },
  { value: "top", label: "Üstte", icon: PanelTop, hint: "Yazının üstünde tam genişlikte" },
  { value: "bottom", label: "Altta", icon: PanelBottom, hint: "Yazının altında tam genişlikte" },
];

function TextBlock({
  block,
  onChange,
  vars,
}: {
  block: Extract<Block, { kind: "text" }>;
  onChange: (b: Block) => void;
  vars: boolean;
}) {
  const image = block.image;
  const setImage = (patch: Partial<Media>) =>
    onChange({ ...block, image: { ...(image ?? newMedia()), ...patch } });
  return (
    <div className="space-y-3">
      <TextEditor
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
        max={LIMITS.blockText}
        rows={5}
        vars={vars}
        placeholder="Yazı: başlık için # kullan, **kalın**, listeler, bağlantılar…"
      />
      <UrlField
        label="Görsel"
        value={image?.url ?? ""}
        onChange={(url) =>
          onChange({ ...block, image: url ? { ...(image ?? newMedia()), url } : null })
        }
        vars={vars}
      />
      {image && (
        <>
          <div className="space-y-1.5 text-sm">
            <span className="block text-muted-foreground">Görselin yeri</span>
            <div role="radiogroup" aria-label="Görselin yeri" className="flex flex-wrap gap-2">
              {POSITIONS.map((p) => {
                const disabled = p.value === "left";
                const on = block.image_pos === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={disabled}
                    title={p.hint}
                    onClick={() => p.value !== "left" && onChange({ ...block, image_pos: p.value })}
                    className={`flex w-24 flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs transition-colors ${
                      on
                        ? "border-accent bg-primary/15 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    } disabled:cursor-not-allowed disabled:opacity-35`}
                  >
                    <p.icon className="h-5 w-5" />
                    {p.label}
                  </button>
                );
              })}
            </div>
            <p className={hintClass}>
              {POSITIONS.find((p) => p.value === block.image_pos)?.hint}. Discord görseli yazının
              soluna koymaz.
            </p>
          </div>
          <MediaExtras media={image} onChange={setImage} />
        </>
      )}
    </div>
  );
}

function MediaExtras({ media, onChange }: { media: Media; onChange: (m: Partial<Media>) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        value={media.description}
        onChange={(e) => onChange({ description: e.target.value })}
        maxLength={LIMITS.mediaDescription}
        placeholder="görsel açıklaması (alt metin, isteğe bağlı)"
        className={`${inputClass} min-w-48 flex-1`}
      />
      <Toggle
        checked={media.spoiler}
        onChange={(spoiler) => onChange({ spoiler })}
        label="Spoiler (bulanık)"
      />
    </div>
  );
}

function GalleryBlock({
  items,
  onChange,
  vars,
}: {
  items: Media[];
  onChange: (m: Media[]) => void;
  vars: boolean;
}) {
  const set = (i: number, patch: Partial<Media>) =>
    onChange(items.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <div className="space-y-3">
      {items.map((m, i) => (
        <div key={i} className="space-y-2 rounded-lg bg-background/40 p-3">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <UrlField
                label={`${i + 1}. görsel`}
                value={m.url}
                onChange={(url) => set(i, { url })}
                vars={vars}
              />
            </div>
            <ItemControls
              what="Görseli"
              index={i}
              length={items.length}
              onMove={(to) => onChange(move(items, i, to))}
              onRemove={() => onChange(items.filter((_, j) => j !== i))}
            />
          </div>
          <MediaExtras media={m} onChange={(p) => set(i, p)} />
        </div>
      ))}
      {items.length < LIMITS.gallery && (
        <button
          type="button"
          onClick={() => onChange([...items, newMedia()])}
          className={buttonClass}
        >
          <Plus className="h-3.5 w-3.5" /> görsel ekle
        </button>
      )}
      <p className={hintClass}>En fazla 10 görsel; Discord sayıya göre ızgara halinde dizer.</p>
    </div>
  );
}
