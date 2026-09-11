import {it,expect} from 'vitest';
import {searchTerminalBuffer} from './terminal-search';
const cell=(chars:string,width=1)=>({getChars:()=>chars,getWidth:()=>width});
it('searches soft wraps but not separate output lines and reports terminal coordinates',()=>{
 const lines=[{isWrapped:false,length:5,getCell:(x:number)=>cell('hello'[x])},{isWrapped:true,length:5,getCell:(x:number)=>cell('world'[x])},{isWrapped:false,length:5,getCell:(x:number)=>cell('hello'[x])}];const buffer={length:3,getLine:(row:number)=>lines[row]};
 expect(searchTerminalBuffer(buffer,5,'lowo')).toEqual([{row:0,column:3,length:4}]);
 expect(searchTerminalBuffer(buffer,5,'worldhello')).toEqual([]);
 expect(searchTerminalBuffer(buffer,5,'hello')).toEqual([{row:0,column:0,length:5},{row:2,column:0,length:5}]);
});
it('maps wide and combining Unicode cells without confusing UTF-16 offsets with columns',()=>{
 const cells=[cell('界',2),cell('',0),cell('e\u0301'),cell('!')];const buffer={length:1,getLine:(row:number)=>row===0?{isWrapped:false,length:4,getCell:(x:number)=>cells[x]}:undefined};
 expect(searchTerminalBuffer(buffer,4,'界e\u0301')).toEqual([{row:0,column:0,length:3}]);
 expect(searchTerminalBuffer(buffer,4,'!')).toEqual([{row:0,column:3,length:1}]);
 expect(searchTerminalBuffer(buffer,4,'')).toEqual([]);
});
