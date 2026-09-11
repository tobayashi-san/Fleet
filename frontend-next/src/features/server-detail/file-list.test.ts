import {describe,it,expect} from 'vitest';
import {filterFileEntries,describePermissions} from './file-list';
describe('remote file listing',()=>{
 it('filters dotfiles and names without mutating entries or recursively searching',()=>{
  const entries=[{name:'file10',type:'file'},{name:'.env',type:'file'},{name:'file2',type:'file'},{name:'Folder',type:'directory'},{name:'.link',type:'symlink'}];
  expect(filterFileEntries(entries,'',false).map(e=>e.name)).toEqual(['Folder','file2','file10']);
  expect(filterFileEntries(entries,' FILE ',true).map(e=>e.name)).toEqual(['file2','file10']);
  expect(filterFileEntries(entries,'.',true).map(e=>e.name)).toEqual(['.env','.link']);
  expect(filterFileEntries(entries,'.',false)).toEqual([]);
  expect(entries[0].name).toBe('file10');
 });
 it('explains ordinary, special and unknown Unix permissions',()=>{
  expect(describePermissions(0o640)).toBe('Owner: read, write; group: read; others: none');
  expect(describePermissions(0o1755)).toBe('Owner: read, write, execute; group: read, execute; others: read, execute; sticky bit');
  expect(describePermissions(0)).toBe('Owner: none; group: none; others: none');
  expect(describePermissions(NaN)).toBe('Permissions unavailable');
 });
});
