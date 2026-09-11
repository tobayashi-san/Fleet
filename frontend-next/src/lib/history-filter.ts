import { DISPLAY_TIME_ZONE, parseApiDate } from './utils';
export interface HistoryFilters { query: string; action?: string; status: string; from: string; to: string }
const dateParts = new Intl.DateTimeFormat('en', {timeZone:DISPLAY_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
export function matchesHistory(row: {action?: string; status?: string; started_at?: string}, text: string, filters: HistoryFilters) {
  if(filters.action && row.action !== filters.action) return false;
  if(filters.status && row.status !== filters.status) return false;
  if(filters.query && !text.toLocaleLowerCase().includes(filters.query.trim().toLocaleLowerCase())) return false;
  if(filters.from || filters.to) {
    if (!row.started_at) return false;
    const date=parseApiDate(row.started_at);
    if(!date || !Number.isFinite(date.getTime())) return false;
    const parts=dateParts.formatToParts(date);
    const get=(type:string)=>parts.find(part=>part.type===type)?.value;
    const key=`${get('year')}-${get('month')}-${get('day')}`;
    if((filters.from && key<filters.from) || (filters.to && key>filters.to)) return false;
  }
  return true;
}
