import {it,expect} from 'vitest';
import {normalizeStringList} from './string-list-input';
it('normalizes pasted lists without losing an edited final entry or mutating the draft',()=>{
 const draft=[' production ','media, database','','production','web server'];
 expect(normalizeStringList(draft)).toEqual(['production','media','database','web server']);
 expect(draft[0]).toBe(' production ');
});
