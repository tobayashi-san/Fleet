// Enumerate calendar dates and allowed wall-clock times. Verify each candidate
// with node-cron's own matcher, including both instants in a repeated DST hour.
function nextMatches(matcher, from, count = 1) {
  const zone = matcher.timezone || 'UTC';
  const format = new Intl.DateTimeFormat('en-GB', {timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  const wall = date => {
    const parts = Object.fromEntries(format.formatToParts(date).map(part => [part.type, part.value]));
    return Date.UTC(+parts.year,+parts.month-1,+parts.day,+parts.hour,+parts.minute,+parts.second);
  };
  const [seconds, minutes, hours, days, months, weekdays] = matcher.expressions.map(values => [...values].sort((a,b)=>a-b));
  const dayMs = 86400000;
  const start = Math.floor(from.getTime()/dayMs)*dayMs-dayMs;
  const found = new Set();
  for(let dayIndex=0;dayIndex<366*13;dayIndex++) {
    const day = new Date(start+dayIndex*dayMs);
    if(!months.includes(day.getUTCMonth()+1) || !days.includes(day.getUTCDate()) || !weekdays.includes(day.getUTCDay())) continue;
    const offsets = new Set();
    for(let hour=-48;hour<=48;hour+=12) {
      const sample=new Date(day.getTime()+hour*3600000);
      offsets.add(wall(sample)-sample.getTime());
    }
    const maxOffset = Math.max(...offsets);
    times: for(const hour of hours) for(const minute of minutes) for(const second of seconds) {
      const target=day.getTime()+hour*3600000+minute*60000+second*1000;
      const best = [...found].sort((a,b)=>a-b);
      if(best.length >= count && target - maxOffset > best[count-1]) break times;
      for(const offset of offsets) {
        const time=target-offset;
        if(time>from.getTime() && wall(new Date(time))===target && matcher.match(new Date(time))) found.add(time);
      }
    }
    // Scan one extra local date so extreme UTC offsets cannot reorder results.
    const ordered=[...found].sort((a,b)=>a-b);
    if(ordered.length>=count && day.getTime()>ordered[count-1]+dayMs) return ordered.slice(0,count).map(time=>new Date(time));
  }
  return [...found].sort((a,b)=>a-b).slice(0,count).map(time=>new Date(time));
}
module.exports={nextMatches};
