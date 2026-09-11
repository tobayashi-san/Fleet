import { describe, expect, it } from 'vitest';
import { lineDiff } from './line-diff';
describe('line diff',()=>{
  it.each([
    ['',''],['','hello\n'],['old\n',''],['one\ntwo\n','one\nnew\ntwo\n'],
    ['same\nx\nsame','same\nsame'],['a\r\nb','a\nb'],['one\n','one'],
  ])('preserves both complete texts: %j → %j',(before,after)=>{
    const result=lineDiff(before,after);
    expect(result.lines.filter(line=>line.kind!=='added').map(line=>line.text).join('\n')).toBe(before);
    expect(result.lines.filter(line=>line.kind!=='removed').map(line=>line.text).join('\n')).toBe(after);
    for(const line of result.lines){
      if(line.before) expect(before.split('\n')[line.before-1]).toBe(line.text);
      if(line.after) expect(after.split('\n')[line.after-1]).toBe(line.text);
    }
  });
  it('retains matching context around separated edits',()=>{
    const result=lineDiff('start\nold\ncontext\nlast\nend','start\nnew\ncontext\nchanged\nend');
    expect(result.lines.filter(line=>line.kind==='same').map(line=>line.text)).toEqual(['start','context','end']);
  });
  it('bounds large comparisons without dropping content',()=>{
    const before=Array.from({length:600},(_,i)=>`old ${i}`).join('\n');
    const after=Array.from({length:600},(_,i)=>`new ${i}`).join('\n');
    const result=lineDiff(before,after);
    expect(result.simplified).toBe(true);
    expect(result.lines.filter(line=>line.kind==='removed').map(line=>line.text).join('\n')).toBe(before);
    expect(result.lines.filter(line=>line.kind==='added').map(line=>line.text).join('\n')).toBe(after);
  });
});
