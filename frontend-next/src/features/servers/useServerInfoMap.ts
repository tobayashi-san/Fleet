import { api } from "@/lib/api";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	type ServerInfo
} from "./server-list-utils";


export const BATCH_SIZE = 5;

export const BATCH_DELAY_MS = 150;

export function useServerInfoMap(serverIds: string[]) {
  const [infoMap, setInfoMap] = useState<Record<string, ServerInfo>>({});
  // Per-server monotonic sequence so older in-flight responses can't overwrite newer ones.
  const seqRef = useRef<Record<string, number>>({});

  const loadBatch = useCallback(
    (ids: string[], force = false, signal?: AbortSignal) => {
      ids.forEach((id, i) => {
        const mySeq = (seqRef.current[id] || 0) + 1;
        seqRef.current[id] = mySeq;
        const delay = Math.floor(i / BATCH_SIZE) * BATCH_DELAY_MS;
        setTimeout(() => {
          if (signal?.aborted) return;
          api
            .getServerInfo(id, force)
            .then((info) => {
              if (signal?.aborted || !info) return;
              // Drop result if a newer request for this server has been issued.
              if (seqRef.current[id] !== mySeq) return;
              setInfoMap((prev) => ({
                ...prev,
                [id]: info as unknown as ServerInfo,
              }));
            })
            .catch(() => {
              /* ignore */
            });
        }, delay);
      });
    },
    [],
  );

  const loadInfos = useCallback(
    (ids: string[], force = false) => {
      if (ids.length === 0) return;
      loadBatch(ids, force);
    },
    [loadBatch],
  );

  useEffect(() => {
    if (serverIds.length === 0) return;
    const controller = new AbortController();
    loadBatch(serverIds, false, controller.signal);
    return () => {
      controller.abort();
    };
  }, [serverIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { infoMap, loadInfos };
}
