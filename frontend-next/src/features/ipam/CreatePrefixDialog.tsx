import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PrefixConnectionSelect } from '@/features/deployments/PrefixConnectionSelect';
import { tr } from '@/features/ipam/prefix-model';
import { apiFetch } from "@/lib/api";
import { prefixInputErrors } from "@/lib/ipam-form-validation";
import { showToast } from "@/lib/toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cloneElement, isValidElement, useId, useState } from "react";
import { statusLabel } from './prefix-model';

export function CreatePrefixDialog({
  open,
  onOpenChange,
  environmentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  environmentId: string;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [cidr, setCidr] = useState("");
  const [gateway, setGateway] = useState("");
  const [dhcpStart, setDhcpStart] = useState("");
  const [dhcpEnd, setDhcpEnd] = useState("");
  const [dns, setDns] = useState("");
  const [vlan, setVlan] = useState("");
  const [bridge, setBridge] = useState("");
  const [connectionId, setConnectionId] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");
  const [role, setRole] = useState("");
  const inputErrors = prefixInputErrors(vlan, dhcpStart, dhcpEnd);
  const create = useMutation({
    mutationFn: () =>
      apiFetch("/ipam/subnets", {
        method: "POST",
        body: {
          environment_id: environmentId,
          name,
          cidr,
          gateway,
          dhcp_start: dhcpStart,
          dhcp_end: dhcpEnd,
          vlan_id: vlan.trim(),
          bridge,
          proxmox_connection_id: connectionId,
          description,
          status,
          role,
          dns_servers: dns
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        },
      }),
    onSuccess: () => {
      showToast(tr("prefixCreated"), "success");
      onOpenChange(false);
      void queryClient.invalidateQueries({ queryKey: ["ipam"] });
    },
    onError: (error: Error) => showToast(error.message, "error"),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{tr("addPrefix")}</DialogTitle>
          <DialogDescription>
            {tr("addPrefixDescription")}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (create.isPending || inputErrors.length) return;
            create.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr("name")}>
              <Input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={tr("productionNetworkPlaceholder")}
              />
            </Field>
            <Field label={tr("ipv4Prefix")}>
              <Input
                required
                value={cidr}
                onChange={(event) => setCidr(event.target.value)}
                placeholder="10.20.10.0/24"
              />
            </Field>
          </div>
          <details className="rounded-md border bg-muted/15">
            <summary className="cursor-pointer select-none px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              {tr("advancedNetwork")}
            </summary>
            <div className="grid gap-4 border-t p-3 sm:grid-cols-2">
              <Field label={tr("status")}>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-8 w-full rounded-sm border bg-background px-2.5 text-[13px]"
                >
                  {Object.entries(statusLabel).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={tr("role")}>
                <Input
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder={tr("productionRoleExample")}
                />
              </Field>
              <Field label={tr("gateway")}>
                <Input
                  value={gateway}
                  onChange={(event) => setGateway(event.target.value)}
                  placeholder="10.20.10.1"
                />
              </Field>
              <Field label={tr("dhcpStart")}>
                <Input
                  value={dhcpStart}
                  onChange={(event) => setDhcpStart(event.target.value)}
                  placeholder="10.20.10.100"
                  inputMode="decimal"
                />
              </Field>
              <Field label={tr("dhcpEnd")}>
                <Input
                  value={dhcpEnd}
                  onChange={(event) => setDhcpEnd(event.target.value)}
                  placeholder="10.20.10.200"
                  inputMode="decimal"
                />
              </Field>
              <p className="sm:col-span-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                {tr("dhcpRangeHint")}
              </p>
              <Field label={tr("dnsServers")}>
                <Input
                  value={dns}
                  onChange={(event) => setDns(event.target.value)}
                  placeholder="10.20.10.10, 10.20.10.11"
                />
              </Field>
              <Field label={tr("vlanId")}>
                <Input
                  value={vlan}
                  onChange={(event) => setVlan(event.target.value)}
                  inputMode="numeric"
                  placeholder="2010"
                />
              </Field>
              <PrefixConnectionSelect environmentId={environmentId} value={connectionId} onChange={setConnectionId} />
              <Field label={tr("bridge")}>
                <Input
                  value={bridge}
                  onChange={(event) => setBridge(event.target.value)}
                  placeholder={tr("bridgePlaceholder")}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label={tr("descriptionLabel")}>
                  <Input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder={tr("productionNetworkExample")}
                  />
                </Field>
              </div>
            </div>
          </details>
          {inputErrors.map(key => <p key={key} role="alert" className="text-sm text-destructive">{tr(key)}</p>)}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {tr("cancel")}
            </Button>
            <Button type="submit" disabled={create.isPending || inputErrors.length > 0}>
              {tr("addPrefix")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const generatedId = useId();
  const child = isValidElement<{ id?: string }>(children)
    ? cloneElement(children, { id: children.props.id || generatedId })
    : children;
  const controlId = isValidElement<{ id?: string }>(child)
    ? child.props.id
    : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={controlId}>{label}</Label>
      {child}
    </div>
  );
}
