import {useState} from 'react';
import {Link, useNavigate} from '@tanstack/react-router';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {api, apiFetch, ApiError} from '@/lib/api';
import {setToken} from '@/lib/auth';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';

export function MfaEnrollmentPage() {
  const navigate=useNavigate();
  const qc=useQueryClient();
  const status=useQuery({queryKey:['mfa-enrollment-status'],queryFn:()=>apiFetch<{enabled:boolean;required:boolean;policy:string}>('/auth/totp/status'),retry:false,staleTime:0});
  const [setup,setSetup]=useState<{secret:string;qrDataUrl:string}|null>(null);
  const [code,setCode]=useState('');
  const [pending,setPending]=useState(false);
  const [error,setError]=useState('');
  const [expired,setExpired]=useState(false);
  function failure(reason:unknown, fallback:string) {
    if(reason instanceof ApiError && reason.status===401) { setSetup(null);setCode('');setExpired(true);setError('Your setup session expired or changed. Sign in again to continue.'); }
    else setError(reason instanceof Error ? reason.message : fallback);
  }
  async function start() {
    setPending(true);setError('');
    try {setSetup(await apiFetch('/auth/totp/setup',{method:'POST'}));}
    catch(reason){failure(reason,'Could not start MFA setup.');}
    finally{setPending(false);}
  }
  async function confirm(event:React.FormEvent) {
    event.preventDefault();setPending(true);setError('');
    try {const result=await api.totpConfirm(code);setToken(result.token);setSetup(null);setCode('');qc.clear();await navigate({to:'/'});}
    catch(reason){failure(reason,'Could not verify your code.');}
    finally{setPending(false);}
  }
  return <main className="grid min-h-screen place-items-center bg-background p-4"><section className="w-full max-w-lg space-y-5 rounded-xl border bg-card p-6 shadow-sm">
    <div><p className="text-sm text-muted-foreground">Account security</p><h1 className="mt-2 text-2xl font-semibold">Set up multi-factor authentication</h1></div>
    <p className="text-sm text-muted-foreground">Your workspace requires a second factor before you can continue. This sign-in allows only MFA setup and expires after 10 minutes. If it expires, sign in again to continue. An unfinished setup keeps the same authenticator key when reopened.</p>
    {status.isPending && <p role="status">Checking your account…</p>}
    {status.isError && <p role="alert" className="text-sm text-destructive">{status.error.message}. Sign in again to continue.</p>}
    {status.isSuccess && !expired && (status.data.enabled ? <p className="text-sm">MFA is already enabled. Sign in again with your authenticator.</p> : !setup ? <Button disabled={pending} onClick={()=>void start()}>{pending ? 'Preparing setup…' : 'Set up authenticator'}</Button> : <form onSubmit={confirm} className="space-y-4">
      <p className="text-sm">Scan this QR code with your authenticator app, then enter its current six-digit code.</p>
      <img src={setup.qrDataUrl} alt="Authenticator setup QR code" className="mx-auto h-48 w-48 rounded bg-white p-2"/>
      <details className="rounded-md border p-3 text-sm"><summary className="cursor-pointer">Enter the setup key manually</summary><p className="mt-2 break-all font-mono select-all">{setup.secret}</p><p className="mt-2 text-xs text-muted-foreground">Keep this key private. It grants access to your second factor.</p></details>
      <div><Label htmlFor="enrollment-code">Authenticator code</Label><Input id="enrollment-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} disabled={pending} onChange={event=>setCode(event.target.value.replace(/\s/g,''))}/></div>
      <Button type="submit" disabled={pending}>{pending ? 'Verifying…' : 'Verify and open workspace'}</Button>
    </form>)}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <p className="text-xs text-muted-foreground">Lost access to an existing authenticator? Contact your workspace administrator.</p>
    <Button variant="outline" asChild><Link to="/login">Back to sign in</Link></Button>
  </section></main>;
}
