import {defaultFilter} from 'cmdk';
/** Match the complete authorized inventory before limiting rendered results. */
export function commandSearch<T>(items:T[],search:string,limit:number,text:(item:T)=>string,keywords:(item:T)=>string[]=()=>[]) {
  if(!search.trim())return items.slice(0,limit);
  return items.map(item=>({item,score:defaultFilter(text(item),search,keywords(item))})).filter(result=>result.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(result=>result.item);
}
