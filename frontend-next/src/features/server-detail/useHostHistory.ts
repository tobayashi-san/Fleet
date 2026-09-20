import { apiFetch } from "@/lib/api";
import { type HistoryFilters } from "@/lib/history-filter";
import { hasCap } from "@/lib/queries";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import type {
  HistoryRow
} from "./server-detail-model";

import type { HostQueryContext } from './host-controller-context';

export function useHostHistory({ id, server, profile }: HostQueryContext) {
  const HIST_PAGE_SIZE = 25;
  const [histPage, setHistPage] = useState(1);
  const [historyFilters, setHistoryFilters] = useState<HistoryFilters>({ query: '', status: '', from: '', to: '' });
  useEffect(() => setHistPage(1), [historyFilters, id]);
  const historyParams = new URLSearchParams({page:String(histPage),page_size:String(HIST_PAGE_SIZE),action:historyFilters.action || '',status:historyFilters.status,search:historyFilters.query,from:historyFilters.from,to:historyFilters.to});
  const { data: historyResponse, isLoading: historyLoading, isFetching: historyFetching, isError: historyFailed, refetch: refetchHistory } = useQuery({
    queryKey: ["server", id, "history", histPage, historyFilters],
    queryFn: () => apiFetch<{items:HistoryRow[];actions:string[];total_unfiltered:number;pagination:{page:number;total:number;total_pages:number}}>(`/servers/${encodeURIComponent(id)}/history?${historyParams}`),
    refetchInterval: query => query.state.data?.items?.some(run => ["running", "pending", "queued", "cancelling"].includes(run.status || "")) ? 3000 : false,
    enabled: !!server && hasCap(profile, "canViewServerHistory"),
  });
  const history = historyResponse?.items || [];
  const historyCount = historyResponse?.total_unfiltered || 0;
  const historyMatchCount = historyResponse?.pagination.total || 0;
  const historyActions = historyResponse?.actions || [];
  const histItems = history;
  const histTotal = historyResponse?.pagination.total_pages || 1;
  const histSafe = historyResponse?.pagination.page || histPage;
  const histPage_ = history;

  return {
    HIST_PAGE_SIZE,
    histPage,
    setHistPage,
    historyFilters,
    setHistoryFilters,
    historyLoading,
    historyFetching,
    historyFailed,
    refetchHistory,
    history,
    historyCount,
    historyMatchCount,
    historyActions,
    histItems,
    histTotal,
    histSafe,
    histPage_,
  };
}
