/** Aggregate catalog types without presenting an unobserved catalog as healthy. */
export function summarizeUpdates(input: {
  offline: boolean;
  osCount: number | null;
  stale?: boolean;
  imageStale?: boolean;
  imageCount?: number;
  customStale?: boolean;
  customCount?: number;
  customFailed?: boolean;
  reasons?: { code: string; count: number }[];
}): { label: string; tone: 'info' | 'warning' | 'success' } {
  if (input.offline) return { label: 'Host offline · last known data', tone: 'info' };
  const reasons = input.reasons ?? [];
  const warnings = [
    ...(input.stale ? ['OS catalog stale · refresh'] : []),
    ...(input.imageStale ? ['Image check missing or stale'] : []),
    ...(input.customStale ? ['Custom check missing or stale'] : []),
    ...(reasons.some(reason => reason.code === 'reboot_required') ? ['Reboot required'] : []),
    ...((input.customFailed || reasons.some(reason => reason.code === 'custom_check_failed')) ? ['Custom update check failed'] : []),
  ];
  const count = (code: string) => reasons.find(reason => reason.code === code)?.count ?? 0;
  const inventoryOs = reasons.find(reason => reason.code === 'os_updates')?.count;
  if (input.osCount !== null && inventoryOs !== undefined && inventoryOs !== input.osCount) {
    warnings.push(`OS counts differ: catalog ${input.osCount}, inventory ${inventoryOs}; refresh both sources`);
  }
  const inventoryImages = reasons.find(reason => reason.code === 'image_updates')?.count;
  if (input.imageCount !== undefined && inventoryImages !== undefined && inventoryImages !== input.imageCount) {
    warnings.push(`Image counts differ: catalog ${input.imageCount}, inventory ${inventoryImages}; refresh both sources`);
  }
  const inventoryCustom = reasons.find(reason => reason.code === 'custom_updates')?.count;
  if (input.customCount !== undefined && inventoryCustom !== undefined && inventoryCustom !== input.customCount) {
    warnings.push(`Custom counts differ: catalog ${input.customCount}, inventory ${inventoryCustom}; refresh both sources`);
  }
  const categories = [
    [Math.max(input.osCount ?? 0, count('os_updates')), 'OS'],
    [Math.max(input.imageCount ?? 0, count('image_updates')), 'image'],
    [Math.max(input.customCount ?? 0, count('custom_updates')), 'custom'],
  ] as const;
  const pending = categories.filter(([total]) => total > 0);
  if (pending.length) return {
    label: [pending.map(([total, name]) => `${total} ${name}`).join(' · ') + ' updates', ...warnings].join(' · '),
    tone: 'warning',
  };
  if (warnings.length) return { label: warnings.join(' · '), tone: 'warning' };
  return input.osCount === null
    ? { label: 'OS catalog not available', tone: 'info' }
    : { label: 'No updates reported', tone: 'success' };
}
