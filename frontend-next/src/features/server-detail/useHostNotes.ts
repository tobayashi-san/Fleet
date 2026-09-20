import { api } from "@/lib/api";
import { hasCap } from "@/lib/queries";
import { showToast } from "@/lib/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { newestNotesRevision } from "./notes-revision";

import type { HostQueryContext } from './host-controller-context';

export function useHostNotes({ id, server, profile }: HostQueryContext) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data: notesData, isError: notesFailed, refetch: refetchNotes } = useQuery({
    queryKey: ["server", id, "notes"],
    queryFn: () => api.getServerNotes(id),
    enabled: !!server && hasCap(profile, "canViewNotes"),
  });
  // ── Notes state ─────────────────────────────────────────────
  const [notes, setNotes] = useState("");
  const [notesEditing, setNotesEditing] = useState(false);
  const renderedNotes = useMemo(() => {
    if (!notes.trim()) return "";
    return DOMPurify.sanitize(marked.parse(notes, { async: false }) as string);
  }, [notes]);
  const [notesBase, setNotesBase] = useState<(Awaited<ReturnType<typeof api.getServerNotes>> & { host: string }) | null>(null);
  const notesDirty = Boolean(notesBase?.host === id && notes !== notesBase.notes);

  useEffect(() => {
    if (notesData && (!notesBase || notesBase.host !== id)) {
      setNotes(notesData.notes);
      setNotesBase({ ...notesData, host: id });
    }
  }, [id, notesData, notesBase]);
  const notesViewRef = useRef({ host: id });
  if (notesViewRef.current.host !== id) notesViewRef.current = { host: id };
  const saveNotesMut = useMutation({
    mutationFn: async (text: string) => {
      const view = notesViewRef.current;
      const host = view.host;
      const result = await api.saveServerNotes(host, text, notesBase?.revision ?? -1);
      return { host, view, result };
    },
    onSuccess: ({ host, view, result }) => {
      qc.setQueryData<typeof result>(['server', host, 'notes'], current => newestNotesRevision(current, result));
      qc.invalidateQueries({ queryKey: ['server', host, 'notes-history'] });
      if (notesViewRef.current !== view) return;
      setNotesBase({ ...result, host });
      showToast(t('det.notesSaved'), 'success');
    },
    onMutate: () => notesViewRef.current,
    onError: (error: Error, _variables, view) => { if (notesViewRef.current === view) showToast(error.message, 'error'); },
  });
  const reloadNotesMut = useMutation({
    mutationFn: async () => {
      const view = notesViewRef.current;
      const host = view.host;
      return { host, view, result: await api.getServerNotes(host) };
    },
    onSuccess: ({ host, view, result }) => {
      qc.setQueryData<typeof result>(['server', host, 'notes'], current => newestNotesRevision(current, result));
      if (notesViewRef.current !== view) return;
      setNotes(result.notes);
      setNotesBase({ ...result, host });
      saveNotesMut.reset();
    },
    onMutate: () => notesViewRef.current,
    onError: (error: Error, _variables, view) => { if (notesViewRef.current === view) showToast(error.message, 'error'); },
  });


  return {
    notesData,
    notesFailed,
    refetchNotes,
    notes,
    notesEditing,
    setNotes,
    setNotesEditing,
    renderedNotes,
    notesBase,
    notesDirty,
    saveNotesMut,
    reloadNotesMut,
  };
}
