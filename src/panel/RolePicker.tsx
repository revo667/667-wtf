import { X } from "lucide-react";
import { roleHex } from "./format";
import type { RoleMeta } from "./types";
import { selectClass } from "./ui";

/** Rol seçici: seçilenler renkli etiket olarak durur, eklemek için açılır liste. */
export function RolePicker({
  value,
  onChange,
  roles,
  disabled = false,
  emptyText,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  roles: RoleMeta[];
  disabled?: boolean;
  /** Boşken gösterilecek not; verilmezse "kimse kullanamaz" uyarısı. */
  emptyText?: string;
}) {
  const byId = new Map(roles.map((r) => [r.id, r]));
  const rest = roles.filter((r) => !value.includes(r.id));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {value.length === 0 &&
        (emptyText ? (
          <span className="text-xs text-muted-foreground">{emptyText}</span>
        ) : (
          <span className="text-xs text-destructive">rol seçilmedi: kimse kullanamaz</span>
        ))}
      {value.map((id) => {
        const r = byId.get(id);
        return (
          <span
            key={id}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs"
            style={{ color: roleHex(r?.color) }}
          >
            @{r?.name ?? id}
            {!disabled && (
              <button
                type="button"
                aria-label={`@${r?.name ?? id} kaldır`}
                onClick={() => onChange(value.filter((v) => v !== id))}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        );
      })}
      {!disabled && rest.length > 0 && (
        <select
          aria-label="Rol ekle"
          value=""
          onChange={(e) => e.target.value && onChange([...value, e.target.value])}
          className={`${selectClass} h-7 text-xs`}
        >
          <option value="">+ rol</option>
          {rest.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
