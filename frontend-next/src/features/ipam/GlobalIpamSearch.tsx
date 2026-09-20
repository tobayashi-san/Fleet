import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Paginated, SearchResult, tr } from '@/features/ipam/prefix-model';
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
	Search
} from "lucide-react";
import { useDeferredValue, useState } from "react";

export function GlobalIpamSearch({ environmentId }: { environmentId: string }) {
  const [value, setValue] = useState("");
  const deferredValue = useDeferredValue(value.trim());
  const results = useQuery({
    queryKey: ["ipam", "global-search", environmentId, deferredValue],
    queryFn: () => apiFetch<Paginated<SearchResult>>(
      `/ipam/search?environment_id=${encodeURIComponent(environmentId)}&q=${encodeURIComponent(deferredValue)}&page=1&page_size=12`,
    ),
    enabled: deferredValue.length > 0,
  });
  const rows = results.data?.items || [];
  return (
    <Card className="relative z-20">
      <CardContent className="p-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="pl-9"
            placeholder={tr("globalSearch")}
            aria-label={tr("globalSearchLabel")}
          />
        </label>
        {deferredValue && (
          <div className="mt-3 overflow-hidden rounded-md border">
            {results.isPending ? (
              <p className="p-3 text-sm text-muted-foreground">{tr("searching")}</p>
            ) : results.isError ? (
              <p className="p-3 text-sm text-destructive">{tr("searchFailed")}</p>
            ) : rows.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">{tr("searchEmpty")}</p>
            ) : (
              <div className="divide-y">
                {rows.map((row) => (
                  <Link
                    key={`${row.kind}:${row.id}`}
                    to="/networks/$id"
                    params={{ id: row.subnet_id }}
                    className="flex items-center justify-between gap-4 px-3 py-2.5 hover:bg-muted/30"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{row.kind}</Badge>
                        <span className="truncate font-mono text-sm font-medium">{row.label}</span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.secondary}</p>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{row.subnet_cidr}</span>
                  </Link>
                ))}
                {(results.data?.total || 0) > rows.length && (
                  <p className="bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
                    {tr("searchMore", { shown: rows.length, total: results.data?.total })}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
