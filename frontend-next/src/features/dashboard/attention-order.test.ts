import { describe, expect, it } from 'vitest';
import { compareAttentionHosts, attentionPriority, type AttentionHost } from './attention-order';

describe('dashboard attention priority', () => {
  it('keeps critical hosts in the collapsed six-host queue ahead of alphabetically earlier warnings', () => {
    const warnings: AttentionHost[] = Array.from({length:8},(_,i)=>({id:`w${i}`,name:`A warning ${i}`,updates_count:20,attention:{requiresAttention:true,severity:'warning'}}));
    const critical: AttentionHost = {id:'critical',name:'Z database',attention:{requiresAttention:true,severity:'critical'}};
    expect([...warnings,critical].sort(compareAttentionHosts).slice(0,6)[0]).toBe(critical);
  });
  it('uses deterministic natural name order within the same severity', () => {
    const hosts = ['host10','host2','host1'].map(name=>({id:name,name,status:'offline'}));
    expect(hosts.sort(compareAttentionHosts).map(host=>host.name)).toEqual(['host1','host2','host10']);
    expect(compareAttentionHosts({id:'2',name:'Same'},{id:'1',name:'Same'})).toBeGreaterThan(0);
  });
  it('prefers canonical state and preserves legacy offline/update fallbacks without treating unknown as healthy evidence', () => {
    expect(attentionPriority({id:1,name:'Offline',status:'offline'})).toBe(2);
    expect(attentionPriority({id:2,name:'Updates',image_updates_count:1})).toBe(1);
    expect(attentionPriority({id:3,name:'Unknown'})).toBe(0);
    expect(attentionPriority({id:4,name:'Canonical',updates_count:100,attention:{requiresAttention:false,severity:'healthy'}})).toBe(0);
  });
});
