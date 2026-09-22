import {useEffect,useState} from 'react';
import {formatDateTime,formatDateTimeWithZone,parseApiDate} from '@/lib/utils';

const RELATIVE_WINDOW_SECONDS = 7 * 86400;

/**
 * Recent times read as an age ("12 minutes ago"); older ones as a date. The
 * exact time with its zone is always available on hover.
 */
export function Timestamp({value,hour12,compact=true}:{value:string|number|Date|null|undefined;hour12?:boolean;compact?:boolean}) {
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60_000);return()=>clearInterval(timer);},[]);
  const date=value==null?null:parseApiDate(value);
  if(!date || !Number.isFinite(date.getTime()))return <span>—</span>;
  const seconds=(date.getTime()-now)/1000;
  const unit=Math.abs(seconds)<60?'second':Math.abs(seconds)<3600?'minute':Math.abs(seconds)<86400?'hour':'day';
  const divisor={second:1,minute:60,hour:3600,day:86400}[unit];
  const relative=new Intl.RelativeTimeFormat('en',{numeric:'auto'}).format(Math.round(seconds/divisor),unit);
  const options=hour12===undefined?{}:{hour12};
  const absolute=formatDateTime(date,options);
  const recent=Math.abs(seconds)<RELATIVE_WINDOW_SECONDS;
  return <time dateTime={date.toISOString()} title={`${formatDateTimeWithZone(date,options)} · ${relative}`} className={compact ? 'whitespace-nowrap' : undefined}>{compact ? (recent ? relative : absolute) : absolute}{!compact && <span className="ml-1 text-muted-foreground">· {relative}</span>}</time>;
}
