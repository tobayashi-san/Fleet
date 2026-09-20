import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Folder,
	X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	getDescendantIds,
	type ServerGroup
} from "./server-list-utils";


export const PRESET_COLORS = [
  "#6366f1",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
];

export interface GroupDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    color: string;
    parentId: string | null;
    environmentId: string;
  }) => Promise<unknown>;
  title: string;
  confirmText: string;
  groups: ServerGroup[];
  editId?: string | null;
  defaultName?: string;
  defaultColor?: string;
  defaultParentId?: string | null;
  allowTopLevel: boolean;
  parentScope: string[];
  environmentId: string;
}

export function GroupDialog({
  open,
  onClose,
  onSubmit,
  title,
  confirmText,
  groups,
  editId,
  defaultName = "",
  defaultColor,
  defaultParentId = null,
  allowTopLevel,
  parentScope,
  environmentId,
}: GroupDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(defaultName);
  const [color, setColor] = useState(defaultColor || PRESET_COLORS[0]);
  const [parentId, setParentId] = useState<string | null>(
    defaultParentId ?? null,
  );

  const [saving,setSaving]=useState(false);
  const [saveError,setSaveError]=useState<string | null>(null);
  const submitting=useRef(false);
  const wasOpen=useRef(false);
  const [openingEnvironment,setOpeningEnvironment]=useState(environmentId);
  const contextChanged=openingEnvironment !== environmentId;
  useEffect(() => {
    if (open && !wasOpen.current) {
      setOpeningEnvironment(environmentId);
      setSaveError(null);
      setName(defaultName);
      setColor(defaultColor || PRESET_COLORS[0]);
      setParentId(defaultParentId ?? null);
    }
    wasOpen.current=open;
  }, [open, defaultName, defaultColor, defaultParentId, environmentId]);

  const excludeIds = editId
    ? getDescendantIds(groups, editId)
    : new Set<string>();
  const parentOptions = groups.filter((g) => !excludeIds.has(g.id) && parentScope.includes(g.id));

  const handleSubmit = async () => {
    if (submitting.current || contextChanged || !name.trim() || (!allowTopLevel && !parentId)) return;
    submitting.current=true;setSaving(true);setSaveError(null);
    try {
      await onSubmit({name:name.trim(),color,parentId:parentId || null,environmentId:openingEnvironment});
      onClose();
    } catch(error) {
      setSaveError(error instanceof Error ? error.message : 'Folder could not be saved.');
    } finally {submitting.current=false;setSaving(false);}
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !submitting.current) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {contextChanged && <p role="alert" className="text-sm text-warning">Environment changed. Close this draft and reopen it in the intended environment.</p>}
        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
        <fieldset disabled={saving || contextChanged} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="server-group-name">{t("common.name")}</Label>
            <Input
              id="server-group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("srv.groupNamePlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.nativeEvent.isComposing) {e.preventDefault();void handleSubmit();}
              }}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label id="server-group-color-label">{t("srv.groupColor")}</Label>
            <div className="flex flex-wrap gap-1.5 items-center">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  className={`w-6 h-6 rounded-full border-2 ${c === color ? "ring-2 ring-offset-2 ring-offset-background" : "border-transparent"}`}
                  style={{
                    background: c,
                    borderColor: c === color ? c : "transparent",
                  }}
                  type="button"
                  aria-label={`${t("srv.groupColor")}: ${c}`}
                  onClick={() => setColor(c)}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-6 h-6 p-0 border-none rounded-full cursor-pointer bg-transparent"
                title={t("common.customColor")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="server-group-parent">{t("srv.parentFolder")}</Label>
            <select
              id="server-group-parent"
              value={parentId || ""}
              onChange={(e) => setParentId(e.target.value || null)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {allowTopLevel && <option value="">{t("srv.noneTopLevel")}</option>}
              {parentOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </fieldset>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving || contextChanged || !name.trim() || (!allowTopLevel && !parentId)}>{saving ? 'Saving…' : confirmText}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function MoveDropdown({
  groups,
  onSelect,
  onClose,
}: {
  groups: ServerGroup[];
  onSelect: (groupId: string | null) => void;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const timer = setTimeout(
      () => document.addEventListener("click", handler),
      0,
    );
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", handler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-1 z-50 w-48 rounded-md border bg-popover p-1 shadow-md"
    >
      <button
        onClick={() => onSelect(null)}
        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
      >
        <X className="h-3.5 w-3.5 text-muted-foreground" />{" "}
        {t("srv.moveToRoot")}
      </button>
      {groups.map((g) => (
        <button
          key={g.id}
          onClick={() => onSelect(g.id)}
          className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
        >
          <Folder
            className="h-3.5 w-3.5"
            style={{ color: g.color || PRESET_COLORS[0] }}
          />{" "}
          {g.name}
        </button>
      ))}
    </div>
  );
}
