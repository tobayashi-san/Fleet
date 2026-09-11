import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Star, X } from 'lucide-react';
import { showToast } from '@/lib/toast';

export interface FavoriteResource { path: string; label: string; context?: string }
export function InfrastructureFavorites({scope, currentPath, resources, inventoryComplete, onNavigate}: {scope:string|null;currentPath:string;resources:FavoriteResource[];inventoryComplete:boolean;onNavigate?:()=>void}) {
  const [stored,setStored]=useState<{scope:string|null;paths:string[]}>({scope:null,paths:[]});
  const key=scope ? `shipyard.infrastructure.favorites:${scope}` : null;
  useEffect(()=>{
    try {
      const parsed=key ? JSON.parse(localStorage.getItem(key)||'[]') : [];
      setStored({scope,paths:Array.isArray(parsed)?[...new Set(parsed.filter((value):value is string=>typeof value==='string'))].slice(0,50):[]});
    } catch {setStored({scope,paths:[]});}
  },[key,scope]);
  const paths=stored.scope===scope?stored.paths:[];
  const current=resources.find(item=>item.path===currentPath);
  const visible=resources.filter(item=>paths.includes(item.path));
  const save=(next:string[])=>{
    if(!key)return;
    try {localStorage.setItem(key,JSON.stringify(next));setStored({scope,paths:next});}
    catch {showToast('Favorites could not be saved in this browser.','error');}
  };
  return <details className="px-1 pb-2 text-xs">
    <summary className="cursor-pointer text-muted-foreground">Favorites ({visible.length})</summary>
    <div className="mt-2 space-y-2">
      <p className="text-muted-foreground">Open a resource to add it. Stored for this account and environment in this browser.</p>
      <button type="button" className="flex items-center gap-1 rounded border px-2 py-1 disabled:opacity-50" disabled={!scope||!current||(!paths.includes(current.path)&&paths.length>=50)} onClick={()=>current&&save(paths.includes(current.path)?paths.filter(path=>path!==current.path):[...paths,current.path])}><Star className="h-3 w-3" />{current&&paths.includes(current.path)?'Remove current favorite':'Favorite current resource'}</button>
      {visible.map(item=><div key={item.path} className="flex items-center gap-1"><Link to={item.path} onClick={onNavigate} className="min-w-0 flex-1 break-words hover:text-primary"><span className="block">{item.label}</span>{item.context && <span className="block text-[11px] text-muted-foreground">{item.context}</span>}</Link><button type="button" className="p-2" aria-label={`Remove favorite ${item.label}${item.context ? ` (${item.context})` : ''}`} onClick={()=>save(paths.filter(path=>path!==item.path))}><X className="h-3 w-3" /></button></div>)}
      {!inventoryComplete && <p role="status" className="text-muted-foreground">Inventory is loading or incomplete. Unavailable favorites are retained.</p>}
      {paths.length>=50 && <p className="text-muted-foreground">50 favorites saved. Remove one before adding another.</p>}
      {inventoryComplete && paths.length>visible.length&&<button type="button" className="text-muted-foreground underline" onClick={()=>save(visible.map(item=>item.path))}>Remove unavailable favorites</button>}
    </div>
  </details>;
}
