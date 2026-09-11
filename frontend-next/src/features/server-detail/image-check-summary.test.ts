import { expect, it } from 'vitest';
import { imageCheckSummary } from './image-check-summary';
it('never reports unresolved or empty checks as healthy success', () => {
 for (const results of [[], [{status:'unknown'}], [{status:'not_checkable'}], [{status:'future_status'}]]) expect(imageCheckSummary(results).kind).toBe('warning');
});
it('counts verified results separately from attempted results', () => {
 const summary = imageCheckSummary([{status:'up_to_date'},{status:'update_available'},{status:'unknown'}]);
 expect(summary.kind).toBe('warning');
 expect(summary.description).toContain('2 of 3 results verified');
 expect(summary.description).toContain('1 updates available');
 expect(summary.description).toContain('1 unresolved');
});
it('reports success only when all returned images are verified without available updates', () => {
 expect(imageCheckSummary([{status:'up_to_date'},{status:'updated'}]).kind).toBe('success');
 expect(imageCheckSummary([{status:'update_available'}]).kind).toBe('warning');
});
