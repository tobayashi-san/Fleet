interface Cell {getChars():string;getWidth():number}
interface Line {isWrapped:boolean;length:number;getCell(column:number):Cell|undefined}
interface Buffer {length:number;getLine(row:number):Line|undefined}
export interface TerminalMatch {row:number;column:number;length:number}
/** Literal, case-sensitive search with terminal-cell coordinates, including soft wraps. */
export function searchTerminalBuffer(buffer:Buffer,columns:number,query:string):TerminalMatch[] {
  if (!query) return [];
  const matches:TerminalMatch[]=[];
  let text='';let starts:number[]=[];let ends:number[]=[];
  const flush=()=>{
    let offset=text.indexOf(query);
    while(offset>=0){const start=starts[offset];const end=ends[offset+query.length-1];matches.push({row:Math.floor(start/columns),column:start%columns,length:end-start});offset=text.indexOf(query,offset+Math.max(1,query.length));}
    text='';starts=[];ends=[];
  };
  for(let row=0;row<buffer.length;row++){
    const line=buffer.getLine(row);if(!line)continue;
    if(!line.isWrapped)flush();
    const wraps=buffer.getLine(row+1)?.isWrapped;
    const cells=Array.from({length:Math.min(columns,line.length)},(_,column)=>line.getCell(column));
    let limit=cells.length;
    if(!wraps)while(limit>0&&!cells[limit-1]?.getChars())limit--;
    for(let column=0;column<limit;column++){
      const cell=cells[column];if(!cell||cell.getWidth()===0)continue;
      const chars=cell.getChars()||' ';text+=chars;
      for(let i=0;i<chars.length;i++){starts.push(row*columns+column);ends.push(row*columns+column+cell.getWidth());}
    }
  }
  flush();return matches;
}
