import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiFetch } from "@/lib/api";
import { showToast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	Box
} from "lucide-react";
import {
	useState
} from "react";

import { statusLabel, statusTone, tr } from "./network-presentation";
import type { Prefix } from "./network-types";
export function ChildPrefixTable({
  rows,
  loading = false,
  canEdit,
}: {
  rows: Prefix[];
  loading?: boolean;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedRows = rows.filter((row) => selected.has(row.id));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const someSelected = selectedRows.length > 0 && !allSelected;
  const updateStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      Promise.all(
        ids.map((id) =>
          apiFetch(`/ipam/subnets/${encodeURIComponent(id)}/status`, {
            method: "PATCH",
            body: { status },
          }),
        ),
      ),
    onSuccess: (_result, variables) => {
      setSelected(new Set());
      showToast(
        tr("childPrefixesUpdated", { count: variables.ids.length }),
        "success",
      );
      void queryClient.invalidateQueries({ queryKey: ["ipam"] });
    },
    onError: (error: Error) =>
      showToast(
        error.message || tr("statusUpdateFailed"),
        "error",
      ),
  });
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 border-b bg-muted/15 py-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Box className="h-4 w-4" />
            {tr("childPrefixes")}
          </CardTitle>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {tr("directChildrenDescription")}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canEdit && selectedRows.length > 0 && (
            <>
              <span className="whitespace-nowrap text-xs font-medium tabular-nums">
                {tr("selected", { count: selectedRows.length })}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({
                    ids: selectedRows.map((row) => row.id),
                    status: "active",
                  })
                }
              >
                {tr("active")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={updateStatus.isPending}
                onClick={() =>
                  updateStatus.mutate({
                    ids: selectedRows.map((row) => row.id),
                    status: "reserved",
                  })
                }
              >
                {tr("reserved")}
              </Button>
            </>
          )}
          <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {rows.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <EmptyState compact title={tr("loadingChildren")} />
        ) : rows.length === 0 ? (
          <p className="p-8 text-sm text-muted-foreground">
            {tr("noDirectChildren")}
          </p>
        ) : (
          <>
            <div className="divide-y md:hidden">
              {rows.map((child) => (
                <div
                  key={child.id}
                  className="flex gap-3 p-4"
                  data-selected={selected.has(child.id) || undefined}
                >
                  {canEdit && <input
                    className="mt-1"
                    type="checkbox"
                    aria-label={tr("selectPrefix", { cidr: child.cidr })}
                    checked={selected.has(child.id)}
                    onChange={() => toggle(child.id)}
                  />}
                  <Link
                    to="/networks/$id"
                    params={{ id: child.id }}
                    className="min-w-0 flex-1 transition-colors hover:text-primary"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 font-mono font-medium">
                          <Box className="h-4 w-4 shrink-0 text-brand" />
                          {child.cidr}
                        </div>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {child.name ||
                            child.description ||
                            tr("noDescription")}
                        </p>
                      </div>
                      <StatusBadge tone={statusTone(child.status)} dot>
                        {statusLabel[child.status] || child.status}
                      </StatusBadge>
                    </div>
                    <div className="mt-3 flex justify-between text-xs text-muted-foreground">
                      <span>
                        {child.vlan_id ? `VLAN ${child.vlan_id}` : tr("noVlan")}{" "}
                        ·{" "}
                        <span className="font-mono">{child.bridge || "—"}</span>
                      </span>
                      <span>{tr("freeCount", { count: child.free_address_count })}</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
            <div className="table-scroll hidden md:block">
              <table
                data-density="compact"
                className="w-full min-w-[760px] text-sm"
              >
                <thead>
                  <tr>
                    {canEdit && <th className="w-11 px-3">
                      <input
                        type="checkbox"
                        aria-label={tr("selectAllChildren")}
                        checked={allSelected}
                        ref={(input) => {
                          if (input) input.indeterminate = someSelected;
                        }}
                        onChange={() =>
                          setSelected(
                            allSelected
                              ? new Set()
                              : new Set(rows.map((row) => row.id)),
                          )
                        }
                      />
                    </th>}
                    <th className="px-3">{tr("prefixes")}</th>
                    <th className="px-3">{tr("status")}</th>
                    <th className="px-3">{tr("vlanBridge")}</th>
                    <th className="px-3">{tr("free")}</th>
                    <th className="px-3">{tr("descriptionLabel")}</th>
                    <th className="w-20 px-3 text-right">{tr("open")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((child) => (
                    <tr
                      key={child.id}
                      data-selected={selected.has(child.id) || undefined}
                    >
                      {canEdit && <td className="px-3">
                        <input
                          type="checkbox"
                          aria-label={tr("selectPrefix", { cidr: child.cidr })}
                          checked={selected.has(child.id)}
                          onChange={() => toggle(child.id)}
                        />
                      </td>}
                      <td className="px-3">
                        <Link
                          to="/networks/$id"
                          params={{ id: child.id }}
                          className="flex items-center gap-2 font-mono font-medium hover:text-primary hover:underline"
                        >
                          <Box className="h-4 w-4 text-brand" />
                          {child.cidr}
                        </Link>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {child.name || tr("noDescription")}
                        </div>
                      </td>
                      <td className="px-3">
                        <StatusBadge tone={statusTone(child.status)} dot>
                          {statusLabel[child.status] || child.status}
                        </StatusBadge>
                      </td>
                      <td className="px-3">
                        {child.vlan_id ? `VLAN ${child.vlan_id}` : "—"}{" "}
                        <span className="font-mono text-xs text-muted-foreground">
                          {child.bridge || "—"}
                        </span>
                      </td>
                      <td className="px-3 font-mono">
                        {child.free_address_count}
                      </td>
                      <td className="max-w-[20rem] px-3">
                        <span className="block truncate text-muted-foreground">
                          {child.description || "—"}
                        </span>
                      </td>
                      <td className="px-3 text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/networks/$id" params={{ id: child.id }}>
                            {tr("open")}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

