import {expect,it} from 'vitest';
import {commandSearch} from './command-search';
it('finds a host beyond the rendered initial limit by name or IP',()=>{
 const hosts=Array.from({length:100},(_,i)=>({name:`Host ${i}`,ip:`192.0.2.${i}`}));
 expect(commandSearch(hosts,'',30,h=>h.name)).toHaveLength(30);
 expect(commandSearch(hosts,'Host 99',30,h=>h.name,h=>[h.ip])[0]).toEqual(hosts[99]);
 expect(commandSearch(hosts,'192.0.2.99',30,h=>h.name,h=>[h.ip])[0]).toEqual(hosts[99]);
});
it('finds later playbooks and returns no entries for unmatched queries',()=>{
 const playbooks=Array.from({length:60},(_,i)=>`automation-${i}.yml`);
 expect(commandSearch(playbooks,'automation-59',20,p=>p)[0]).toBe(playbooks[59]);
 expect(commandSearch(playbooks,'unmatched request',20,p=>p)).toEqual([]);
});
