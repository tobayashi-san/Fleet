import {describe,it,expect} from 'vitest';
import {jsonChanges} from './json-changes';
describe('manifest JSON comparison',()=>{
  it('ignores object key ordering and preserves added, removed and changed properties',()=>{
    expect(jsonChanges({a:1,b:2},{b:2,a:1})).toEqual([]);
    expect(jsonChanges({interval:30,old:true},{interval:60,added:null})).toEqual([{path:'$["interval"]',before:30,after:60},{path:'$["old"]',before:true,after:undefined},{path:'$["added"]',before:undefined,after:null}]);
  });
  it('shows reordered collectors as a change',()=>expect(jsonChanges({collectors:['a','b']},{collectors:['b','a']})).toHaveLength(1));
});
