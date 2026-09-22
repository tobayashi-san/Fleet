import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Paintbrush, Save } from "lucide-react";
import { api } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { useSettings } from "@/lib/queries";
import { QueryErrorState } from "@/components/ui/query-error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SettingsRow, SettingsSection } from "../_row";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";

const DEFAULTS = {
  appName: "",
  accentColor: "#17704f",
};

interface WhiteLabel {
  appName?: string;
  accentColor?: string;
}

export function AppearanceTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const settingsQuery = useSettings();
  const { data: settings } = settingsQuery;
  const wl = (settings as unknown as WhiteLabel) || {};

  const [draft, setDraft] = useState<{appName:string;accentColor:string} | null>(null);
  const appName = draft?.appName ?? wl.appName ?? "";
  const color = draft?.accentColor ?? (wl.accentColor || DEFAULTS.accentColor);
  const setAppName = (value:string) => setDraft({appName:value,accentColor:color});
  const setColor = (value:string) => setDraft({appName,accentColor:value});
  const validColor = /^#[0-9a-fA-F]{6}$/.test(color);
  const dirty = appName !== (wl.appName || "") || color !== (wl.accentColor || DEFAULTS.accentColor);
  useUnsavedChanges(dirty);

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.saveSettings(data),
    onSuccess: (_result, values) => {
      qc.setQueryData(["settings"], (previous:WhiteLabel | undefined) => ({...previous,...values}));
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["settings"] });
      showToast(t("set.toastSaved"), "success");
    },
    onError: () => showToast(t("set.toastErrorSave"), "error"),
  });

  const reset = useMutation({
    mutationFn: () => api.saveSettings({ appName: "", accentColor: "" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      qc.setQueryData(["settings"], (previous:WhiteLabel | undefined) => ({...previous,appName:"",accentColor:""}));
      setDraft(null);
      showToast(t("set.toastReset"), "success");
    },
    onError: () => showToast(t("set.toastErrorReset"), "error"),
  });

  const handleSave = () => {
    save.mutate({
      appName: appName.trim(),
      accentColor: color,
    });
  };

  const busy = save.isPending || reset.isPending;
  if (settingsQuery.isError) return <QueryErrorState title="Appearance settings could not be loaded" error={settingsQuery.error} onRetry={() => void settingsQuery.refetch()} />;
  if (settingsQuery.isPending) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="space-y-5">
      <SettingsSection
        icon={<Paintbrush className="h-4 w-4" />}
        title={t("set.whiteLabel")}
        description="Global installation name and accent color for all users. Changes apply after saving."
      >
        <SettingsRow label={t("set.appName")} labelId="appearance-app-name-label" hint={t("set.appNameHint")}>
          <Input
            aria-labelledby="appearance-app-name-label"
            maxLength={100}
            disabled={busy}
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="Shipyard"
            className="max-w-xs"
          />
        </SettingsRow>

        <SettingsRow
          label={"Browser / brand color"}
          labelId="appearance-accent-color-label"
          hint="Brand color used for the browser icon and browser chrome. Buttons, text and status colors follow your personal console theme."
        >
          <input
            aria-labelledby="appearance-accent-color-label"
            type="color"
            disabled={busy}
            value={validColor ? color : DEFAULTS.accentColor}
            onChange={(e) => setColor(e.target.value)}
            className="h-9 w-12 cursor-pointer rounded border border-input bg-background"
          />
          <Input
            aria-labelledby="appearance-accent-color-label"
            value={color}
            disabled={busy}
            aria-invalid={!validColor}
            aria-describedby="appearance-color-feedback"
            onChange={(e) => {
              const v = e.target.value;
              setColor(v);
            }}
            className="max-w-[140px] font-mono"
            placeholder="#17704f"
          />
        </SettingsRow>

        {!validColor && <p id="appearance-color-feedback" role="alert" className="text-sm text-destructive">Enter a six-digit hex color, such as #3b82f6.</p>}
        {(save.isError || reset.isError) && <p role="alert" className="text-sm text-destructive">{save.error?.message || reset.error?.message}</p>}
        <SettingsRow label={null} noBorder>
          <Button onClick={handleSave} disabled={busy || !dirty || !validColor} size="sm">
            <Save className="h-4 w-4" />{" "}
            {save.isPending ? t("set.saving") : t("set.saveApply")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => reset.mutate()}
            disabled={busy}
          >
            Reset global branding
          </Button>
          {draft && <Button variant="outline" size="sm" disabled={busy} onClick={() => setDraft(null)}>Discard branding changes</Button>}
        </SettingsRow>
      </SettingsSection>

    </div>
  );
}
