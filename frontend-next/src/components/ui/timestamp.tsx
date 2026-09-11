import {useEffect,useState} from 'react';
import {formatDateTime,parseApiDate} from '@/lib/utils';

/** Absolute audit time remains visible while the relative age updates each minute. */
export function Timestamp({value,hour12}:{value:string|number|Date|null|undefined;hour12?:boolean}) {
  const [now,setNow]=useState(Date.now);
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),60_000);return()=>clearInterval(timer);},[]);
  const date=value==null?null:parseApiDate(value);
  if(!date || !Number.isFinite(date.getTime()))return <span>—</span>;
  const seconds=(date.getTime()-now)/1000;
  const unit=Math.abs(seconds)<60?'second':Math.abs(seconds)<3600?'minute':Math.abs(seconds)<86400?'hour':'day';
  const divisor={second:1,minute:60,hour:3600,day:86400}[unit];
  const relative=new Intl.RelativeTimeFormat('en',{numeric:'auto'}).format(Math.round(seconds/divisor),unit);
  return <time dateTime={date.toISOString()}>{formatDateTime(date,hour12===undefined?{}:{hour12})}<span className="ml-1 text-muted-foreground">· {relative}</span></time>;
}
