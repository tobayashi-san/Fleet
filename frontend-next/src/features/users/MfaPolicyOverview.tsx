import {useQuery} from '@tanstack/react-query';
import {apiFetch} from '@/lib/api';
import {formatDateTime} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {QueryErrorState} from '@/components/ui/query-error-state';
interface PolicyOverview {
  mode:'optional'|'admins'|'all';configurationValid:boolean;checkedAt:number;
  activeAccounts:number;disabledAccounts:number;requiredAccounts:number;enrolledRequiredAccounts:number;optionalAccounts:number;
  needsEnrollment:{id:string;username:string;displayName:string;role:string}[];
}
const labels={optional:'Optional for every account',admins:'Required for administrators',all:'Required for every account'};
export function MfaPolicyOverview() {
  const query=useQuery({queryKey:['users','mfa-policy'],queryFn:()=>apiFetch<PolicyOverview>('/users/mfa-policy'),refetchInterval:30_000});
  const data=query.data;
  return <section className="space-y-3 border-b p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">Multi-factor authentication policy</h3><Button size="sm" variant="outline" disabled={query.isFetching} onClick={()=>void query.refetch()}>{query.isFetching ? 'Checking…' : 'Refresh'}</Button></div>
    {query.isPending && <p role="status" className="text-sm">Checking policy and enrollment…</p>}
    {query.isError && <QueryErrorState compact error={query.error} title="MFA policy could not be checked" onRetry={()=>void query.refetch()}/>}
    {query.isSuccess && data && <>
      <p className="text-sm font-medium">{labels[data.mode]}</p>
      {!data.configurationValid && <p role="alert" className="text-sm text-destructive">The server policy value is not recognized. MFA is required for all accounts until the server operator corrects the configuration.</p>}
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><dt className="text-xs text-muted-foreground">Covered active accounts</dt><dd className="mt-1 font-semibold">{data.requiredAccounts}</dd></div>
        <div><dt className="text-xs text-muted-foreground">MFA enabled</dt><dd className="mt-1 font-semibold">{data.enrolledRequiredAccounts}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Setup required</dt><dd className="mt-1 font-semibold">{data.needsEnrollment.length}</dd></div>
        <div><dt className="text-xs text-muted-foreground">Optional MFA</dt><dd className="mt-1 font-semibold">{data.optionalAccounts}</dd></div>
      </dl>
      <p className="text-xs text-muted-foreground">Enrollment counts cover active accounts subject to the policy. {data.disabledAccounts} disabled accounts are excluded. Checked {formatDateTime(data.checkedAt)}.</p>
      {data.needsEnrollment.length>0 && <details className="rounded-md border p-3 text-sm"><summary className="cursor-pointer font-medium">Accounts that must finish setup ({data.needsEnrollment.length})</summary><p className="mt-2 text-xs text-muted-foreground">These accounts can sign in to set up an authenticator, but cannot access the workspace until verification succeeds.</p><ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">{data.needsEnrollment.map(user=><li key={user.id} className="break-words">{user.displayName || user.username}{user.displayName && <span className="text-muted-foreground"> · @{user.username}</span>}</li>)}</ul></details>}
      <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">How this policy is managed</summary><p className="mt-2">The server operator sets SHIPYARD_MFA_POLICY to optional, admins or all and restarts the service. Policy changes apply to existing sessions. Required MFA cannot be disabled through self-service; administrator recovery requires the affected user to enroll again. SSO and recovery codes are not provided by this policy.</p></details>
    </>}
  </section>;
}
