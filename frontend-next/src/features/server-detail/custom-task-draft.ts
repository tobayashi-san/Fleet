export interface CustomTaskDraft {
  name: string; type: string; github_repo: string; check_command: string;
  update_command: string; trigger_output: string; latest_command: string;
}
export function customTaskDraft(task?: Partial<CustomTaskDraft> | null): CustomTaskDraft {
  return { name: task?.name || '', type: task?.type || 'script', github_repo: task?.github_repo || '', check_command: task?.check_command || '', update_command: task?.update_command || '', trigger_output: task?.trigger_output || '', latest_command: task?.latest_command || '' };
}
export function customTaskDirty(draft: CustomTaskDraft, task?: Partial<CustomTaskDraft> | null): boolean {
  return JSON.stringify(customTaskDraft(draft)) !== JSON.stringify(customTaskDraft(task));
}
