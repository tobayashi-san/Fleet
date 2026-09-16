/** Rank visible names ahead of metadata; require contiguous query tokens.
 * Subsequence matching made unrelated infrastructure names appear for "media".
 */
export function commandScore(label: string, search: string, keywords: string[] = []): number {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return 1;
  const name = label.split('\u0000')[0].toLocaleLowerCase();
  const tokens = query.split(/\s+/);
  if (name === query) return 1;
  if (name.startsWith(query)) return 0.95;
  if (tokens.every(token => name.split(/[^\p{L}\p{N}]+/u).some(word => word.startsWith(token)))) return 0.9;
  if (tokens.every(token => name.includes(token))) return 0.8;
  const metadata = keywords.join(' ').toLocaleLowerCase();
  return tokens.every(token => `${name} ${metadata}`.includes(token)) ? 0.5 : 0;
}
export function commandSearch<T>(items:T[],search:string,limit:number,text:(item:T)=>string,keywords:(item:T)=>string[]=()=>[]) {
  return items.map(item=>({item,score:commandScore(text(item),search,keywords(item))})).filter(result=>result.score>0).sort((a,b)=>b.score-a.score).slice(0,limit).map(result=>result.item);
}
