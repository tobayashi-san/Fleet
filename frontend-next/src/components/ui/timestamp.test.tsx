import {afterEach,describe,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {Timestamp} from './timestamp';
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
describe('timestamp meaning',()=>{
 it('normalizes UTC and shows elapsed age',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T18:05:00Z'));
  const html=renderToStaticMarkup(<Timestamp value="2026-09-09 18:00:00" hour12={false}/>);
  expect(html).toContain('2026-09-09T18:00:00.000Z');expect(html).toContain('20:00 (Europe/Zurich)');expect(html).toContain('5 minutes ago');
 });
 it('distinguishes future timestamps',()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-09-09T18:00:00Z'));
  expect(renderToStaticMarkup(<Timestamp value="2026-09-09T20:00:00Z"/>)).toContain('in 2 hours');
 });
 it('does not invent missing dates',()=>{
  for(const value of [null,undefined,'invalid'])expect(renderToStaticMarkup(<Timestamp value={value}/>)).toBe('<span>—</span>');
 });
 it('honors explicit host clock preferences',()=>{
  expect(renderToStaticMarkup(<Timestamp value="2026-09-09T18:00:00Z" hour12/>)).toContain('08:00 pm');
 });
});
