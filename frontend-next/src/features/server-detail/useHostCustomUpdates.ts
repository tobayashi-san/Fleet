import { api } from "@/lib/api";
import { hasCap } from "@/lib/queries";
import { useUi } from "@/lib/store";
import { showToast } from "@/lib/toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { bindActionHistory } from './action-events';
import { customTaskDirty, customTaskDraft } from './custom-task-draft';
import type {
  CustomTask
} from "./server-detail-model";

import type { HostActionContext } from './host-controller-context';

export function useHostCustomUpdates({ id, server, profile, startActionRun, setActionRun }: HostActionContext) {
  const qc = useQueryClient();
  const { t } = useTranslation();
  const { data: customTasks, isPending: customTasksLoading, isError: customTasksFailed, refetch: refetchCustomTasks } = useQuery({
    queryKey: ["server", id, "customTasks"],
    queryFn: () =>
      api.getCustomUpdateTasks(id) as unknown as Promise<CustomTask[]>,
    enabled: !!server && hasCap(profile, "canViewCustomUpdates"),
  });
  // Older installations returned an object for an empty task list. Keep the
  // detail view usable while those instances are being upgraded.
  const customTaskList = Array.isArray(customTasks) ? customTasks : [];
  // ── Custom task dialog ──────────────────────────────────────
  const [taskDialog, setTaskDialog] = useState<{
    open: boolean;
    task: CustomTask | null;
  }>({ open: false, task: null });
  const [taskForm, setTaskForm] = useState(() => customTaskDraft());
  const taskEnvironment = useUi(state => state.environmentId);
  const taskContext = useRef<{ dialog: typeof taskDialog | null; host: string; environment: string }>({ dialog: null, host: id, environment: taskEnvironment });
  useEffect(() => {
    if (taskDialog.open && taskContext.current.dialog !== taskDialog) {
      taskContext.current = { dialog: taskDialog, host: id, environment: taskEnvironment };
      setTaskForm(customTaskDraft(taskDialog.task));
    }
  }, [taskDialog, id, taskEnvironment]);
  const taskDirty = taskDialog.open && customTaskDirty(taskForm, taskDialog.task);
  const taskContextChanged = taskDialog.open && (taskContext.current.host !== id || taskContext.current.environment !== taskEnvironment);


  const saveTaskMut = useMutation({
    mutationFn: async () => {
      if (taskContextChanged) throw new Error('Host or environment changed. Return to the original context or reopen this form.');
      const data = {
        ...taskForm,
        github_repo: taskForm.github_repo || null,
        trigger_output: taskForm.trigger_output || null,
        latest_command: taskForm.latest_command || null,
        check_command: taskForm.check_command || null,
      };
      if (taskDialog.task)
        await api.updateCustomUpdateTask(id, taskDialog.task.id, data);
      else await api.createCustomUpdateTask(id, data);
    },
    onSuccess: () => {
      showToast(t("det.taskSaved"), "success");
      setTaskDialog({ open: false, task: null });
      void qc.invalidateQueries({ queryKey: ["server", id, "customTasks"] });
    },
    onError: (e: Error) =>
      showToast(t("common.errorPrefix", { msg: e.message }), "error"),
  });
  
  const deleteTaskMut = useMutation({
    mutationFn: (taskId: string) => api.deleteCustomUpdateTask(id, taskId),
    onSuccess: () => {
      showToast(t("det.taskDeleted"), "success");
      void qc.invalidateQueries({ queryKey: ["server", id, "customTasks"] });
    },
    onError: (e: Error) =>
      showToast(t("common.errorPrefix", { msg: e.message }), "error"),
  });
  
  const checkTaskMut = useMutation({
    mutationFn: (taskId: string) => api.checkCustomUpdateTask(id, taskId),
    onSettled: () =>
      void qc.invalidateQueries({ queryKey: ["server", id, "customTasks"] }),
    onError: (e: Error) =>
      showToast(t("common.errorPrefix", { msg: e.message }), "error"),
  });
  
  const runTaskMut = useMutation({
    mutationFn: (taskId: string) =>
      api.runCustomUpdateTask(id, taskId) as unknown as Promise<{
        historyId: string;
      }>,
    onMutate: (taskId) => {
      const task = (Array.isArray(customTasks) ? customTasks : []).find(
        (t2) => t2.id === taskId,
      );
      return startActionRun(
        `${t("det.output")} · ${task?.name || t("det.customUpdates")}`,
      );
    },
    onSuccess: (data, _variables, requestId) => {
      setActionRun((prev) =>
        bindActionHistory(prev, requestId, data.historyId),
      );
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
  

  return {
    customTasks,
    customTasksLoading,
    customTasksFailed,
    refetchCustomTasks,
    customTaskList,
    taskDialog,
    setTaskDialog,
    taskForm,
    setTaskForm,
    taskDirty,
    taskContextChanged,
    saveTaskMut,
    deleteTaskMut,
    checkTaskMut,
    runTaskMut,
  };
}
