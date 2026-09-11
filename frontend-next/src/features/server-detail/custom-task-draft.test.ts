import { expect, it } from 'vitest';
import { customTaskDraft, customTaskDirty } from './custom-task-draft';
it('tracks changes across all task fields without marking empty defaults dirty', () => {
 expect(customTaskDirty(customTaskDraft(),null)).toBe(false);
 const existing={name:'App',type:'script',check_command:'current',latest_command:'desired'};
 const draft=customTaskDraft(existing);
 expect(customTaskDirty(draft,existing)).toBe(false);
 for (const field of Object.keys(draft) as Array<keyof typeof draft>) expect(customTaskDirty({...draft,[field]:'changed'},existing)).toBe(true);
 expect(customTaskDirty({...draft,check_command:'current'},existing)).toBe(false);
});
