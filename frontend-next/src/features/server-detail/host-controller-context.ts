import type { Profile } from '@/lib/queries';
import type { Dispatch, SetStateAction } from 'react';
import type { TrackedAction } from './action-events';
import type { ServerDetail } from './server-detail-model';
export interface HostQueryContext { id: string; server: ServerDetail | null; profile: Profile | undefined }
export interface HostActionContext extends HostQueryContext {
 startActionRun: (title: string, historyId?: string) => number;
 setActionRun: Dispatch<SetStateAction<TrackedAction | null>>;
}
