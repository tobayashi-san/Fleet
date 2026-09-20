import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
	AlertTriangle
} from "lucide-react";

import { sourceSystemName, tr } from "./network-presentation";
import type { SyncConflict } from "./network-types";
export function SyncConflictPanel({ rows }: { rows: SyncConflict[] }) {
  return (
    <Card className="border-destructive/40">
      <CardHeader className="border-b bg-destructive/[0.04] py-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          {tr("syncConflictsTitle")}{" "}
          <Badge variant="destructive">{rows.length}</Badge>
        </CardTitle>
        <p className="text-sm font-normal text-muted-foreground">
          {tr("syncConflictsDescription")}
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y md:hidden">
          {rows.map((row) => (
            <div
              key={`${row.source_kind}:${row.id}`}
              className="space-y-1.5 p-4 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-medium">{row.address}</span>
                <Badge variant="outline">{row.source_name}</Badge>
              </div>
              <p className="text-muted-foreground">
                {tr("observed")}: {row.hostname || tr("noHostname")}
              </p>
              <p className="text-muted-foreground">
                {tr("existing")}:{" "}
                {row.existing_server_id ? (
                  <Link
                    to="/servers/$id"
                    params={{ id: row.existing_server_id }}
                    className="font-medium text-primary hover:underline"
                  >
                    {row.existing_server_name ||
                      row.existing_hostname ||
                      row.existing_address}
                  </Link>
                ) : (
                  row.existing_hostname ||
                  row.existing_address ||
                  tr("noLongerPresent")
                )}
              </p>
              <p className="text-destructive">{row.reason}</p>
            </div>
          ))}
        </div>
        <div className="table-scroll hidden md:block">
          <table
            className="w-full min-w-[760px] text-sm"
            data-density="compact"
          >
            <thead>
              <tr>
                <th className="px-3">{tr("address")}</th>
                <th className="px-3">{tr("source")}</th>
                <th className="px-3">{tr("observed")}</th>
                <th className="px-3">{tr("existingAssignment")}</th>
                <th className="px-3">{tr("reason")}</th>
                <th className="px-3">{tr("lastSeen")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.source_kind}:${row.id}`}>
                  <td className="px-3 font-mono font-medium">{row.address}</td>
                  <td className="px-3">
                    <span className="font-medium">{row.source_name}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      {sourceSystemName(row.source_type)}
                    </span>
                  </td>
                  <td className="px-3">{row.hostname || "—"}</td>
                  <td className="px-3">
                    {row.existing_server_id ? (
                      <Link
                        to="/servers/$id"
                        params={{ id: row.existing_server_id }}
                        className="font-medium text-primary hover:underline"
                      >
                        {row.existing_server_name ||
                          row.existing_hostname ||
                          row.existing_address}
                      </Link>
                    ) : (
                      row.existing_hostname ||
                      row.existing_address ||
                      tr("noLongerPresent")
                    )}
                  </td>
                  <td className="max-w-[24rem] px-3">
                    <span
                      className="block truncate text-destructive"
                      title={row.reason}
                    >
                      {row.reason}
                    </span>
                  </td>
                  <td className="px-3 text-xs text-muted-foreground">
                    {row.last_seen_at
                      ? formatDateTime(row.last_seen_at)
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

