import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useMutation } from "@tanstack/react-query";

/** Results belong to the submitted content, never to a later edit. */
export function ComposeValidation({ hostId, content, disabled }: {hostId:string;content:string;disabled:boolean}) {
  const validation = useMutation({
    mutationFn: (draft: {hostId:string;content:string}) => apiFetch(`/servers/${draft.hostId}/docker/compose/validate`, {method:'POST',body:{content:draft.content}}),
  });
  const current = validation.variables?.hostId === hostId && validation.variables?.content === content;
  return <section className="rounded-md border p-3 text-xs" aria-label="Compose validation">
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="outline" size="sm" disabled={disabled || validation.isPending || !content.trim()} onClick={() => validation.mutate({hostId,content})}>{validation.isPending ? 'Checking YAML…' : 'Validate YAML'}</Button>
      <span role="status">{!current ? validation.variables ? 'Content changed; validate again.' : 'Not yet validated.' : validation.isPending ? 'Checking syntax and basic structure…' : validation.isSuccess ? 'YAML and basic structure passed.' : null}</span>
    </div>
    {current && validation.isError && <p role="alert" className="mt-2 text-destructive">{validation.error.message}</p>}
    <p className="mt-2 text-muted-foreground">Local check only: no host commands or file writes. This does not verify images, environment variables, referenced files or compatibility with the host's Compose version.</p>
  </section>;
}
