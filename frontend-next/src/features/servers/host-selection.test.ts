import {describe,it,expect} from 'vitest';
import {selectHostPage,hostSelectionScope,groupHostIds} from './host-selection';

describe('host selection across pages and filters',()=>{
  it('selects only current matching hosts in the folder subtree and preserves unrelated targets',()=>{
    const node={id:'parent',children:[{id:'child',children:[]}]};
    const ids=groupHostIds(node,{parent:[{id:'a'}],child:[{id:'b'}],unrelated:[{id:'c'}]});
    expect(ids).toEqual(['a','b']);
    expect([...selectHostPage(new Set(['c']),ids,true)]).toEqual(['c','a','b']);
    expect(groupHostIds(node,{child:[{id:'b'}]})).toEqual(['b']);
  });
  it('selects and deselects only the current page without dropping other selections',()=>{
    const initial=new Set(['first-page','filtered-out']);
    const next=selectHostPage(initial,['second-page'],true);
    expect([...next]).toEqual(['first-page','filtered-out','second-page']);
    expect([...selectHostPage(next,['second-page'],false)]).toEqual([...initial]);
    expect([...initial]).toEqual(['first-page','filtered-out']);
  });
  it('distinguishes off-page and excluded-by-filter selections',()=>{
    expect(hostSelectionScope(new Set(['a','b','hidden']),['a'],['a','b','c'])).toEqual({onPage:1,otherPages:1,outsideFilter:1});
  });
});
