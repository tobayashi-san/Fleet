import {it,expect} from 'vitest';
import {hasHostFolderScope} from './folder-scope';

it('allows root administration only for complete inventory scope',()=>{
  expect(hasHostFolderScope({role:'admin'},null)).toBe(true);
  expect(hasHostFolderScope({permissions:{servers:'all'}},null)).toBe(true);
  expect(hasHostFolderScope({permissions:{servers:{groups:['child']}}},null)).toBe(false);
  expect(hasHostFolderScope(undefined,null)).toBe(false);
});
it('does not turn a visible parent or host-only assignment into folder administration',()=>{
  const profile={permissions:{servers:{groups:['child'],servers:['host']}}};
  expect(hasHostFolderScope(profile,'child')).toBe(true);
  expect(hasHostFolderScope(profile,'parent')).toBe(false);
  expect(hasHostFolderScope({permissions:{servers:{servers:['host']}}},'child')).toBe(false);
});
