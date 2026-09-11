import {expect,it} from 'vitest';
import {filterTargetHosts,scheduleTargetPreview} from './target-hosts';
const hosts=[{name:'web',hostname:'web.internal',ip_address:'10.0.0.1',tags:['Production'],status:'online',group_id:'g1'},{name:'db',hostname:'db.internal',ip_address:'10.0.0.2',tags:['Database'],status:'offline',group_id:'g2'}];
it('shares name, IP, tag and group matching without changing selected targets',()=>{
 expect(filterTargetHosts(hosts,{search:'production',status:'online'}).map(h=>h.name)).toEqual(['web']);
 expect(filterTargetHosts(hosts,{search:'10.0.0.2',group:'g2',tag:'Database'}).map(h=>h.name)).toEqual(['db']);
 const selected=new Set(['web','db']);
 filterTargetHosts(hosts,{search:'web'});
 expect(scheduleTargetPreview(hosts,selected,false).targets).toEqual(['web','db']);
});
it('distinguishes dynamic exclusions, localhost and missing saved targets',()=>{
 expect(scheduleTargetPreview(hosts,new Set(['db']),true)).toEqual({targets:['web'],unavailable:[]});
 expect(scheduleTargetPreview(hosts,new Set(['localhost','removed']),false)).toEqual({targets:['localhost','removed'],unavailable:['removed']});
});
