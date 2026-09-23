import { Badge } from "@/components/ui/badge";
import { Paginated, SearchResult, tr } from '@/features/ipam/prefix-model';
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useDeferredValue, useEffect } from "react";

/**
 * Address, range and host matches for the Networks search field. Prefixes are
 * left out: the prefix list above filters on the same text.
 */
export function GlobalIpamSearch({ environmentId, value, onMatches }: { environmentId: string; value: string; onMatches?: (count: number) => void }) {
  const deferredValue = useDeferredValue(value.trim());
  const results = useQuery({
    queryKey: ["ipam", "global-search", environmentId, deferredValue],
    queryFn: () => apiFetch<Paginated<SearchResult>>(
      `/ipam/search?environment_id=${encodeURIComponent(environmentId)}&q=${encodeURIComponent(deferredValue)}&page=1&page_size=12`,
    ),
    enabled: deferredValue.length > 0,
  });
  const rows = (results.data?.items || []).filter(row => row.kind !== "prefix");
  const matchCount = deferredValue ? rows.length : 0;
  useEffect(() => { onMatches?.(matchCount); }, [matchCount, onMatches]);
  if (!deferredValue || results.isPending || (!results.isError && rows.length === 0)) return null;
  return (
    <section aria-label="Matching addresses" className="border-t">
      <p className="bg-muted/15 px-4 py-2 text-xs font-medium text-muted-foreground">Matching addresses</p>
      {results.isError ? (
        <p className="px-4 py-3 text-sm text-destructive">{tr("searchFailed")}</p>
      ) : (
        <div className="divide-y">
          {rows.map((row) => (
            <Link
              key={`${row.kind}:${row.id}`}
              to="/networks/$id"
              params={{ id: row.subnet_id }}
              className="flex items-center justify-between gap-4 px-4 py-2.5 hover:bg-muted/30"
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
          {(results.data?.total || 0) > (results.data?.items.length || 0) && (
            <p className="bg-muted/15 px-4 py-2 text-xs text-muted-foreground">
              {tr("searchMore", { shown: results.data?.items.length, total: results.data?.total })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
