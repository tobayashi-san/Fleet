import {renderToStaticMarkup} from 'react-dom/server';
import {it,expect} from 'vitest';
import {StorageUsageHistory} from './StorageUsageHistory';
it('shows observed change and date range without creating samples for gaps',()=>{
 const store={id:'local',node_name:'pve',used:30,total:100,capacity_history:[{sampled_at:Date.UTC(2026,8,10,1),used:10,total:100},{sampled_at:Date.UTC(2026,8,10,3),used:30,total:100}]};
 const html=renderToStaticMarkup(<StorageUsageHistory store={store}/>);
 expect(html).toContain('+20.0 percentage points');
 expect(html).toContain('2 samples');
 expect(html.match(/<circle/g)).toHaveLength(2);
 expect(html).not.toContain('<polyline');
 expect(html).toContain('Europe/Zurich');
 expect(renderToStaticMarkup(<StorageUsageHistory store={{...store,capacity_history:[]}}/>)).toContain('No observations recorded');
});

it('selects hourly data and labels the aggregation distinctly',()=>{
 const store={id:'local',node_name:'pve',used:30,total:100,capacity_history:[{sampled_at:1,used:0,total:100}],capacity_history_hourly:[{sampled_at:Date.UTC(2026,8,9),used:20,total:100,observations:3},{sampled_at:Date.UTC(2026,8,10),used:50,total:100,observations:5}]};
 const html=renderToStaticMarkup(<StorageUsageHistory store={store} range="week"/>);
 expect(html).toContain('+30.0 percentage points');
 expect(html).toContain('2 observed hours');
 expect(html).toContain('hourly mean');
 expect(html.match(/<circle/g)).toHaveLength(2);
});
