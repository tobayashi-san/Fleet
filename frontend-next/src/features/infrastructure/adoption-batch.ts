import { ApiError } from '@/lib/api';

export interface AdoptionGuest { name: string; node_name: string; vm_id: number; guest_type?: 'qemu' | 'lxc' }
export interface AdoptionResult { guest: AdoptionGuest; status: 'pending' | 'running' | 'succeeded' | 'failed' | 'unknown'; message?: string; serverId?: string }
export const adoptionKey = (guest: AdoptionGuest) => `${guest.node_name}:${guest.vm_id}`;

/** Completed and uncertain outcomes are never automatically submitted again. */
export async function adoptBatch(rows: AdoptionResult[], run: (guest: AdoptionGuest) => Promise<{server: {id: string}}>, update: (row: AdoptionResult) => void, shouldContinue: () => boolean = () => true) {
  for (const row of rows) {
    if (!shouldContinue()) break;
    if (row.status !== 'pending' && row.status !== 'failed') continue;
    update({...row, status: 'running', message: undefined});
    try {
      const result = await run(row.guest);
      if (typeof result?.server?.id !== 'string' || !result.server.id.trim()) {
        update({...row, status: 'unknown', message: 'The response did not identify the created host. Check the inventory before trying again.'});
      } else update({...row, status: 'succeeded', serverId: result.server.id, message: undefined});
    } catch (error) {
      const rejected = error instanceof ApiError && [400, 403, 404, 409, 422].includes(error.status);
      update({...row, status: rejected ? 'failed' : 'unknown', message: error instanceof Error ? error.message : 'No reliable response received.'});
    }
  }
}
