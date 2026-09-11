type Occurrence={cancelled_at?:string|null;id:string;environment_id:string;series_id?:string|null;starts_at:string};
/** Future members of the exact series and environment, never name-based. */
export function upcomingSeriesIds(rows:Occurrence[],target:Occurrence,now=Date.now()):string[]{
 if(!target.series_id)return [];
 return rows.filter(row=>!row.cancelled_at&&row.series_id===target.series_id&&row.environment_id===target.environment_id&&new Date(row.starts_at).getTime()>now).map(row=>row.id);
}
