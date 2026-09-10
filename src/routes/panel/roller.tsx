import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { ArrowDown, ArrowUp, Lock, Plus } from "lucide-react";
import { api } from "@/panel/api";
import {
  ActionResult,
  ConfirmButton,
  buttonClass,
  inputClass,
  primaryButtonClass,
  usePanelAction,
} from "@/panel/actions";
import { Drawer } from "@/panel/Drawer";
import { num, roleHex } from "@/panel/format";
import { GROUPS, PERMISSIONS, hasBit, permLabels, toBig, withBit } from "@/panel/permissions";
import { useSession } from "@/panel/session";
import { Badge, Card, Notice } from "@/panel/ui";

export const Route = createFileRoute("/panel/roller")({
  component: RolesPage,
});

export interface RoleOut {
  id: string;
  name: string;
  color: number;
  position: number;
  permissions: string;
  hoist: boolean;
  mentionable: boolean;
  managed: boolean;
  everyone: boolean;
  bot_role: boolean;
  members: number;
  editable: boolean;
  assignable: boolean;
  forbidden: string[];
}

interface RolesResponse {
  roles: RoleOut[];
  bot_top: number;
  forbidden_mask: string;
}

function RolesPage() {
  const session = useSession();
  const canEdit = session.level !== "mod";
  const q = useQuery({
    queryKey: ["panel", "roles"],
    queryFn: () => api<RolesResponse>("GET", "/roles"),
  });
  const [editing, setEditing] = useState<RoleOut | "new" | null>(null);
  const close = useCallback(() => setEditing(null), []);
  const move = usePanelAction((v: { id: string; position: number }) =>
    api("POST", `/roles/${v.id}/position`, { position: v.position }),
  );

  if (q.error) return <Notice error={q.error} />;
  const data = q.data;
  const forbiddenMask = toBig(data?.forbidden_mask);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          Bot yalnızca kendi rolünün altındaki rolleri yönetebilir. Yönetici yetkileri politika
          gereği hiçbir role verilemez.
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className={`${primaryButtonClass} ml-auto`}
          >
            <Plus className="h-4 w-4" /> Yeni rol
          </button>
        )}
      </div>
      <ActionResult msg={move.msg} />

      <Card title={data ? `${data.roles.length} rol` : "Roller"}>
        {!data ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Yükleniyor…</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {data.roles.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: roleHex(r.color) ?? "#5d5669" }}
                />
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span style={{ color: roleHex(r.color) }}>{r.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{num(r.members)} üye</span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {r.bot_role && <Badge tone="accent">bot rolü</Badge>}
                  {r.managed && !r.bot_role && <Badge>entegrasyon</Badge>}
                  {r.hoist && <Badge>ayrı göster</Badge>}
                  {r.forbidden.length > 0 && (
                    <Badge tone="danger">yasaklı yetki: {r.forbidden.length}</Badge>
                  )}
                  {!r.editable && !r.bot_role && (
                    <Badge>
                      <Lock className="h-2.5 w-2.5" /> bottan yüksek
                    </Badge>
                  )}
                </span>
                {canEdit && r.assignable && (
                  <span className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Yukarı taşı"
                      disabled={move.busy || r.position + 1 >= data.bot_top}
                      onClick={() => move.run({ id: r.id, position: r.position + 1 })}
                      className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Aşağı taşı"
                      disabled={move.busy || r.position <= 1}
                      onClick={() => move.run({ id: r.id, position: r.position - 1 })}
                      className="rounded-md border border-border p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </span>
                )}
                {canEdit && r.editable && (
                  <button type="button" onClick={() => setEditing(r)} className={buttonClass}>
                    düzenle
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Drawer
        open={editing !== null}
        onClose={close}
        title={editing === "new" ? "Yeni rol" : (editing?.name ?? "")}
      >
        {editing !== null && (
          <RoleEditor
            key={editing === "new" ? "new" : editing.id}
            role={editing === "new" ? null : editing}
            forbiddenMask={forbiddenMask}
            onDone={close}
          />
        )}
      </Drawer>
    </div>
  );
}

function RoleEditor({
  role,
  forbiddenMask,
  onDone,
}: {
  role: RoleOut | null;
  forbiddenMask: bigint;
  onDone: () => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [color, setColor] = useState(roleHex(role?.color) ?? "#8e64d7");
  const [colorless, setColorless] = useState(role ? role.color === 0 : false);
  const [hoist, setHoist] = useState(role?.hoist ?? false);
  const [mentionable, setMentionable] = useState(role?.mentionable ?? false);
  // Rolde zaten duran yasaklı yetkiler kaydedilirken otomatik temizlenir.
  const [perms, setPerms] = useState(() => toBig(role?.permissions) & ~forbiddenMask);
  const existingForbidden = toBig(role?.permissions) & forbiddenMask;

  const save = usePanelAction(
    () => {
      const body = {
        ...(role?.everyone ? {} : { name: name.trim() }),
        color: colorless ? 0 : parseInt(color.slice(1), 16),
        permissions: perms.toString(),
        hoist,
        mentionable,
      };
      return role ? api("PATCH", `/roles/${role.id}`, body) : api("POST", "/roles", body);
    },
    { success: role ? "Rol güncellendi" : "Rol oluşturuldu", onDone },
  );
  const remove = usePanelAction(() => api("DELETE", `/roles/${role!.id}`), {
    success: "Rol silindi",
    onDone,
  });

  return (
    <div className="space-y-5">
      {existingForbidden > 0n && (
        <p className="rounded-lg border border-destructive/50 p-3 text-xs text-destructive">
          Bu rolde yasaklı yetkiler var ({permLabels(existingForbidden).join(", ")}). Kaydettiğinde
          otomatik kaldırılır.
        </p>
      )}

      {!role?.everyone && (
        <label className="block space-y-1.5 text-sm">
          <span className="text-muted-foreground">Ad</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className={inputClass}
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-muted-foreground">Renk</span>
          <input
            type="color"
            value={color}
            disabled={colorless}
            onChange={(e) => setColor(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border border-border bg-transparent disabled:opacity-40"
          />
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={colorless}
            onChange={(e) => setColorless(e.target.checked)}
            className="accent-accent"
          />
          renksiz
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={hoist}
            onChange={(e) => setHoist(e.target.checked)}
            className="accent-accent"
          />
          üye listesinde ayrı göster
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={mentionable}
            onChange={(e) => setMentionable(e.target.checked)}
            className="accent-accent"
          />
          herkes etiketleyebilsin
        </label>
      </div>

      <div className="space-y-4">
        {GROUPS.map((group) => (
          <fieldset key={group} className="rounded-xl border border-border p-4">
            <legend className="px-1 text-xs text-muted-foreground">{group}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {PERMISSIONS.filter((p) => p.group === group).map((p) => {
                const locked = hasBit(forbiddenMask, p.bit);
                return (
                  <label
                    key={p.key}
                    className={`flex items-center gap-2 text-sm ${locked ? "cursor-not-allowed text-muted-foreground/50" : ""}`}
                    title={
                      locked ? "Politika gereği bu yetki panelden hiçbir role verilemez" : p.key
                    }
                  >
                    <input
                      type="checkbox"
                      disabled={locked}
                      checked={!locked && hasBit(perms, p.bit)}
                      onChange={(e) => setPerms((m) => withBit(m, p.bit, e.target.checked))}
                      className="accent-accent"
                    />
                    {locked && <Lock className="h-3 w-3" aria-hidden="true" />}
                    {p.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          type="button"
          disabled={save.busy || (!role?.everyone && !name.trim())}
          onClick={() => save.run(undefined)}
          className={primaryButtonClass}
        >
          {role ? "Kaydet" : "Oluştur"}
        </button>
        {role?.assignable && (
          <ConfirmButton
            label="Rolü sil"
            confirmText={`"${role.name}" silinsin mi?`}
            busy={remove.busy}
            onConfirm={() => remove.run(undefined)}
          />
        )}
        <ActionResult msg={save.msg ?? remove.msg} />
      </div>
    </div>
  );
}
