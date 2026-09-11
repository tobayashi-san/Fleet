'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');
const {pluginCompatibility}=require('../utils/plugin-compatibility');
const runtime={node:'22.15.0',shipyard:'3.0.8-rc.26'};
test('missing requirements remain explicitly unverified',()=>{assert.equal(pluginCompatibility({},runtime).status,'unspecified');assert.equal(pluginCompatibility({engines:{}},runtime).status,'unspecified');});
test('both runtime ranges must match and prereleases follow semantic version rules',()=>{
 assert.equal(pluginCompatibility({engines:{node:'>=22 <23',shipyard:'>=3.0.8-rc.26 <4'}},runtime).status,'compatible');
 const mismatch=pluginCompatibility({engines:{node:'>=24',shipyard:'>=3.0.8-rc.26 <4'}},runtime);assert.equal(mismatch.status,'incompatible');assert.equal(mismatch.requirements[0].matches,false);
 assert.equal(pluginCompatibility({engines:{shipyard:'^3.0.0'}},runtime).status,'incompatible');
});
test('malformed engine declarations are not treated as compatible',()=>{
 for(const engines of [null,[],false,{node:22},{node:''},{shipyard:'banana'}])assert.equal(pluginCompatibility({engines},runtime).status,'invalid');
});
