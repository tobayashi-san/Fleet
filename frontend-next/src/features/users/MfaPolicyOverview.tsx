import {useQuery} from '@tanstack/react-query';
import {apiFetch} from '@/lib/api';
import {QueryErrorState} from '@/components/ui/query-error-state';
import {StatusBadge} from '@/components/ui/status-badge';
interface PolicyOverview {
  mode:'optional'|'admins'|'all';configurationValid:boolean;checkedAt:number;
  activeAccounts:number;disabledAccounts:number;requiredAccounts:number;enrolledRequiredAccounts:number;optionalAccounts:number;
  needsEnrollment:{id:string;username:string;displayName:string;role:string}[];
}
const labels={optional:'Optional for every account',admins:'Required for administrators',all:'Required for every account'};
const accounts=(count:number)=>`${count} ${count === 1 ? 'account' : 'accounts'}`;

/** Policy and one status line; the policy itself is set by the server operator. */
export function MfaPolicyOverview() {
  const query=useQuery({queryKey:['users','mfa-policy'],queryFn:()=>apiFetch<PolicyOverview>('/users/mfa-policy'),refetchInterval:30_000});
  const data=query.data;
  return <section className="space-y-2 border-b p-4">
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="text-sm font-semibold">Multi-factor authentication</h3>
      {data && <span title="Set by SHIPYARD_MFA_POLICY on the server (optional, admins or all).">
        <StatusBadge tone={data.mode === 'optional' ? 'muted' : 'info'}>{labels[data.mode]}</StatusBadge>
      </span>}
    </div>
    {query.isPending && <p role="status" className="text-sm text-muted-foreground">Checking policy…</p>}
    {query.isError && <QueryErrorState compact error={query.error} title="MFA policy could not be checked" onRetry={()=>void query.refetch()}/>}
    {query.isSuccess && data && <>
      {!data.configurationValid && <p role="alert" className="text-sm text-destructive">The server policy value is not recognized, so MFA is required for every account until it is corrected.</p>}
      <p className="text-sm text-muted-foreground">
        {data.requiredAccounts
          ? <>{data.enrolledRequiredAccounts} of {accounts(data.requiredAccounts)} set up{data.needsEnrollment.length ? <> · <span className="text-warning">{data.needsEnrollment.length} still {data.needsEnrollment.length === 1 ? 'needs' : 'need'} setup</span></> : ''}</>
          : <>MFA is optional for all {accounts(data.activeAccounts)}.</>}
      </p>
      {data.needsEnrollment.length>0 && <details className="rounded-md border p-3 text-sm"><summary className="cursor-pointer font-medium">Accounts that must finish setup ({data.needsEnrollment.length})</summary><p className="mt-2 text-xs text-muted-foreground">They can sign in only to set up an authenticator.</p><ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">{data.needsEnrollment.map(user=><li key={user.id} className="break-words">{user.displayName || user.username}{user.displayName && <span className="text-muted-foreground"> · @{user.username}</span>}</li>)}</ul></details>}
    </>}
  </section>;
}
