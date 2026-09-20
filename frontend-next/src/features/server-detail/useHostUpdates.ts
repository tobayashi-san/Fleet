import { api, apiFetch } from "@/lib/api";
import { hasCap } from "@/lib/queries";
import { showToast } from "@/lib/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { bindActionHistory } from './action-events';
import { verifiedOsCheck } from './os-check-result';
interface UpdateCatalog { updates: Record<string, unknown>[]; source: string; updated_at: string | null; cached: boolean; stale: boolean; stale_after_seconds: number }

import type { HostActionContext } from './host-controller-context';

export function useHostUpdates({ id, server, profile, startActionRun, setActionRun }: HostActionContext) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const updateCheckView = useRef({ host: id });
  if (updateCheckView.current.host !== id) updateCheckView.current = { host: id };
  const { data: rawUpdates } = useQuery({
    queryKey: ["server", id, "updates"],
    queryFn: () =>
      apiFetch<UpdateCatalog>(`/servers/${encodeURIComponent(id)}/updates?include_meta=1`),
    enabled: !!server && hasCap(profile, "canViewUpdates"),
    staleTime: 60_000,
  });
  const runUpdateMut = useMutation({
    mutationFn: () =>
      api.runUpdate(id) as unknown as Promise<{ historyId: string }>,
    onMutate: () =>
      startActionRun(`${t("det.updates")} · ${server?.name || ""}`),
    onSuccess: (data, _variables, requestId) => {
      setActionRun((prev) =>
        bindActionHistory(prev, requestId, data.historyId),
      );
      void qc.invalidateQueries({ queryKey: ["server", id] });
    },
    onError: (e: Error, _variables, requestId) => {
      setActionRun((prev) =>
        prev && prev.requestId === requestId
          ? {
              ...prev,
              status: "failed",
              lines: [
                ...prev.lines,
                {
                  text: t("common.errorPrefix", { msg: e.message }),
                  cls: "text-red-400",
                },
              ],
            }
          : prev,
      );
      showToast(t("common.errorPrefix", { msg: e.message }), "error");
    },
  });
  // A manual package check deliberately bypasses the stale-while-revalidate
  // cache. The status panel below stays visible until this exact request has
  // either returned fresh data or reported an error.
  const checkSystemUpdatesMut = useMutation({
    onMutate: () => updateCheckView.current,
    mutationFn: () =>
      apiFetch<UpdateCatalog>(`/servers/${encodeURIComponent(id)}/updates?include_meta=1&force=1`).then(verifiedOsCheck),
    onSuccess: (results, _variables, origin) => {
      if (!origin) return;
      qc.setQueryData(["server", origin.host, "updates"], results);
      if (updateCheckView.current !== origin) return;
      const nested = !Array.isArray(results) ? results.updates : [];
      const rows = Array.isArray(results)
        ? results
        : Array.isArray(nested)
          ? nested
          : [];
      const available = rows.filter((update) => !update.phased).length;
      showToast(
        t("det.systemUpdatesChecked", { count: available }),
        available > 0 ? "warning" : "success",
      );
    },
    onError: (e: Error, _variables, origin) => {
      if (updateCheckView.current !== origin) return;
      showToast(t("det.systemUpdatesCheckFailed"), {
        kind: "error",
        description: e.message,
      });
    },
  });
  
  const updatesList = useMemo(() => {
    if (!rawUpdates) return [];
    const nested = !Array.isArray(rawUpdates)
      ? rawUpdates.updates
      : [];
    const arr = Array.isArray(rawUpdates)
      ? rawUpdates
      : Array.isArray(nested)
        ? nested
        : [];
    return arr.filter((u: Record<string, unknown>) => !u.phased) as {
      package: string;
      current_version?: string | null;
      version?: string;
      phased?: boolean;
      _cached?: boolean;
    }[];
  }, [rawUpdates]);
  const phasedList = useMemo(() => {
    if (!rawUpdates) return [];
    const nested = !Array.isArray(rawUpdates)
      ? rawUpdates.updates
      : [];
    const arr = Array.isArray(rawUpdates)
      ? rawUpdates
      : Array.isArray(nested)
        ? nested
        : [];
    return arr.filter((u: Record<string, unknown>) => u.phased) as {
      package: string;
      current_version?: string | null;
      version?: string;
    }[];
  }, [rawUpdates]);
  

  const resetSystemCheck = checkSystemUpdatesMut.reset;
  useEffect(() => { resetSystemCheck(); }, [id, resetSystemCheck]);

  return {
    rawUpdates,
    runUpdateMut,
    checkSystemUpdatesMut,
    updatesList,
    phasedList,
  };
}
