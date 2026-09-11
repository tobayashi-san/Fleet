export interface DiffLine { kind: 'same' | 'removed' | 'added'; text: string; before?: number; after?: number }
/** Exact text reconstruction, with bounded comparison cost for very large files. */
export function lineDiff(before: string, after: string): { lines: DiffLine[]; simplified: boolean } {
  const a = before === '' ? [] : before.split('\n');
  const b = after === '' ? [] : after.split('\n');
  const lines: DiffLine[] = [];
  let prefix = 0;
  while (prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) {
    lines.push({kind:'same',text:a[prefix],before:prefix+1,after:prefix+1}); prefix++;
  }
  let endA=a.length, endB=b.length;
  while(endA>prefix && endB>prefix && a[endA-1]===b[endB-1]) { endA--; endB--; }
  const n=endA-prefix, m=endB-prefix;
  const simplified=n*m>250000;
  if (simplified) {
    for(let i=prefix;i<endA;i++) lines.push({kind:'removed',text:a[i],before:i+1});
    for(let j=prefix;j<endB;j++) lines.push({kind:'added',text:b[j],after:j+1});
  } else {
    const width=m+1;
    const lengths=new Uint32Array((n+1)*width);
    for(let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) lengths[i*width+j]=a[prefix+i]===b[prefix+j]?1+lengths[(i+1)*width+j+1]:Math.max(lengths[(i+1)*width+j],lengths[i*width+j+1]);
    let i=0,j=0;
    while(i<n || j<m) {
      if(i<n && j<m && a[prefix+i]===b[prefix+j]) { lines.push({kind:'same',text:a[prefix+i],before:prefix+i+1,after:prefix+j+1});i++;j++; }
      else if(i<n && (j===m || lengths[(i+1)*width+j]>=lengths[i*width+j+1])) {lines.push({kind:'removed',text:a[prefix+i],before:prefix+i+1});i++;}
      else {lines.push({kind:'added',text:b[prefix+j],after:prefix+j+1});j++;}
    }
  }
  while(endA<a.length) { lines.push({kind:'same',text:a[endA],before:endA+1,after:endB+1});endA++;endB++; }
  return {lines,simplified};
}
