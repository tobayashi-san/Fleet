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
import { PrefixConnectionSelect } from '@/features/deployments/PrefixConnectionSelect';
import { prefixInputErrors } from "@/lib/ipam-form-validation";
import {
	Pencil,
	Plus,
	Tag
} from "lucide-react";
import {
	useEffect,
	useState
} from "react";

import { Field, sourceSystemName, tr } from "./network-presentation";
import type { Prefix, Reservation, Server } from "./network-types";
export function AddressForm({
  address,
  hostname,
  macAddress,
  description,
  serverId,
  status,
  role,
  servers,
  submitting,
  validation,
  validating,
  onAddress,
  onHostname,
  onMacAddress,
  onDescription,
  onServer,
  onStatus,
  onRole,
  onSubmit,
}: {
  address: string;
  hostname: string;
  macAddress: string;
  description: string;
  serverId: string;
  status: string;
  role: string;
  servers: Server[];
  submitting: boolean;
  validation?: { valid: boolean; message: string };
  validating: boolean;
  onAddress: (value: string) => void;
  onHostname: (value: string) => void;
  onMacAddress: (value: string) => void;
  onDescription: (value: string) => void;
  onServer: (value: string) => void;
  onStatus: (value: string) => void;
  onRole: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!submitting && !validating && validation?.valid) onSubmit();
      }}
    >
      <fieldset disabled={submitting} className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("ipAddress")}>
          <Input
            required
            autoFocus
            value={address}
            onChange={(event) => onAddress(event.target.value)}
            placeholder={tr("ipAddress")}
            inputMode="decimal"
          />
        </Field>
        <Field label={tr("hostname")}>
          <Input
            value={hostname}
            onChange={(event) => onHostname(event.target.value)}
            placeholder={tr("hostnameExample")}
          />
        </Field>
        <Field label={tr("macAddress")}>
          <Input
            value={macAddress}
            onChange={(event) => onMacAddress(event.target.value)}
            placeholder="02:00:00:00:00:01"
            autoComplete="off"
          />
        </Field>
        <Field label={tr("status")}>
          <select
            value={status}
            onChange={(event) => onStatus(event.target.value)}
            className="h-8 w-full rounded-sm border bg-background px-2.5 text-[13px]"
          >
            <option value="active">{tr("active")}</option>
            <option value="reserved">{tr("reserved")}</option>
            <option value="deprecated">{tr("deprecated")}</option>
          </select>
        </Field>
        <p className="sm:col-span-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          {tr("dhcpStatusManagedHint")}
        </p>
        <Field label={tr("role")}>
          <select
            value={role}
            onChange={(event) => onRole(event.target.value)}
            className="h-8 w-full rounded-sm border bg-background px-2.5 text-[13px]"
          >
            <option value="">{tr("noRole")}</option>
            <option value="gateway">{tr("gatewayRole")}</option>
            <option value="vip">{tr("vipRole")}</option>
            <option value="secondary">{tr("secondaryRole")}</option>
            <option value="loopback">{tr("loopbackRole")}</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label={tr("fleetHost")}>
            <select
              value={serverId}
              onChange={(event) => onServer(event.target.value)}
              className="h-8 w-full rounded-sm border bg-background px-2.5 text-[13px]"
            >
              <option value="">{tr("notAssigned")}</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                  {server.ip_address ? ` · ${server.ip_address}` : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label={tr("descriptionLabel")}>
            <Input
              value={description}
              onChange={(event) => onDescription(event.target.value)}
              placeholder={tr("purposePlaceholder")}
            />
          </Field>
        </div>
      </fieldset>
      {address && (
        <p className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
          validation?.valid
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
            : "border-destructive/40 bg-destructive/5 text-destructive"
        }`}>
          {validating ? tr("checkingAddress") : validation?.message || tr("checkingAddress")}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" disabled={submitting || validating || !validation?.valid}>
          <Plus />
          {tr("addIp")}
        </Button>
      </DialogFooter>
    </form>
  );
}

export function RangeForm({
  start,
  end,
  description,
  submitting,
  validation,
  validating,
  onStart,
  onEnd,
  onDescription,
  onSubmit,
}: {
  start: string;
  end: string;
  description: string;
  submitting: boolean;
  validation?: { valid: boolean; message: string };
  validating: boolean;
  onStart: (value: string) => void;
  onEnd: (value: string) => void;
  onDescription: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!submitting && !validating && validation?.valid) onSubmit();
      }}
    >
      <fieldset disabled={submitting} className="grid gap-4 sm:grid-cols-2">
        <Field label={tr("firstAddress")}>
          <Input
            required
            autoFocus
            value={start}
            onChange={(event) => onStart(event.target.value)}
            placeholder={tr("firstAddress")}
            inputMode="decimal"
          />
        </Field>
        <Field label={tr("lastAddress")}>
          <Input
            required
            value={end}
            onChange={(event) => onEnd(event.target.value)}
            placeholder={tr("lastAddress")}
            inputMode="decimal"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={tr("descriptionLabel")}>
            <Input
              value={description}
              onChange={(event) => onDescription(event.target.value)}
              placeholder={tr("rangePurposePlaceholder")}
            />
          </Field>
        </div>
      </fieldset>
      <p className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        {tr("rangeObjectHint")}
      </p>
      {start && end && (
        <p className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${
          validation?.valid
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
            : "border-destructive/40 bg-destructive/5 text-destructive"
        }`}>
          {validating ? tr("checkingRange") : validation?.message || tr("checkingRange")}
        </p>
      )}
      <DialogFooter>
        <Button type="submit" variant="secondary" disabled={submitting || validating || !validation?.valid}>
          <Plus />
          {tr("reserveRange")}
        </Button>
      </DialogFooter>
    </form>
  );
}

function editableReservationValue(reservation: Reservation | null) {
  return reservation
    ? {
        ...reservation,
        status:
          reservation.configured_status ||
          (reservation.status === "dhcp" ? "active" : reservation.status),
      }
    : null;
}

export function DeviceNameDialog({
  reservation,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  reservation: Reservation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  useEffect(() => {
    setName(reservation?.device_name || "");
  }, [reservation]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tr("nameDeviceTitle")}</DialogTitle>
          <DialogDescription>
            {tr("nameDeviceDescription")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label={tr("deviceName")}>
            <Input
              autoFocus
              value={name}
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              placeholder={tr("deviceNamePlaceholder")}
            />
          </Field>
          <div className="rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span className="block">{reservation?.address || "—"}</span>
            <span className="font-mono text-foreground">
              {reservation?.mac_address || "—"}
            </span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tr("cancel")}
          </Button>
          <Button onClick={() => onSave(name.trim())} disabled={saving}>
            <Tag />
            {tr("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditAddressDialog({
  reservation,
  servers,
  open,
  onOpenChange,
  onSave,
  saving,
}: {
  reservation: Reservation | null;
  servers: Server[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (reservation: Reservation) => void;
  saving: boolean;
}) {
  const [value, setValue] = useState<Reservation | null>(
    editableReservationValue(reservation),
  );
  useEffect(() => {
    setValue(editableReservationValue(reservation));
  }, [reservation]);
  if (!value) return null;
  const sourceName = sourceSystemName(value.source_type);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{tr("editAddress")}</DialogTitle>
          <DialogDescription>
            {tr("changeAddressDescription")}
          </DialogDescription>
        </DialogHeader>
        {sourceName && value.source_type !== "manual" ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-sm text-foreground">
            <strong>{tr("syncedFrom", { source: sourceName })}</strong>
            <span className="mt-1 block text-muted-foreground">
              {tr("syncedEditWarning")}
            </span>
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={tr("ipAddress")}>
            <Input
              value={value.address}
              onChange={(event) =>
                setValue({ ...value, address: event.target.value })
              }
            />
          </Field>
          <Field label={tr("status")}>
            <select
              value={value.status}
              onChange={(event) =>
                setValue({ ...value, status: event.target.value })
              }
              className="h-8 w-full rounded-sm border bg-background px-2.5 text-[13px]"
            >
              <option value="active">{tr("active")}</option>
              <option value="reserved">{tr("reserved")}</option>
              <option value="deprecated">{tr("deprecated")}</option>
            </select>
          </Field>
          <Field label={tr("hostname")}>
            <Input
              value={value.hostname || ""}
              onChange={(event) =>
                setValue({ ...value, hostname: event.target.value })
              }
              placeholder={tr("hostnameExample")}
            />
          </Field>
          <Field label={tr("macAddress")}>
            <Input
              value={value.mac_address || ""}
              onChange={(event) =>
                setValue({ ...value, mac_address: event.target.value })
              }
              placeholder="52:54:00:12:34:56"
            />
          </Field>
          <Field label={tr("role")}>
            <select
              value={value.role || ""}
              onChange={(event) =>
                setValue({ ...value, role: event.target.value })
              }
              className="h-8 w-full rounded-sm border bg-background px-2.5 text-[13px]"
            >
              <option value="">{tr("noRole")}</option>
              <option value="gateway">{tr("gatewayRole")}</option>
              <option value="vip">{tr("vipRole")}</option>
              <option value="secondary">{tr("secondaryRole")}</option>
              <option value="loopback">{tr("loopbackRole")}</option>
            </select>
          </Field>
          <Field label={tr("fleetHost")}>
            <select
              value={value.server_id || ""}
              onChange={(event) =>
                setValue({
                  ...value,
                  server_id: event.target.value || undefined,
                })
              }
              className="h-8 w-full rounded-sm border bg-background px-2.5 text-[13px]"
            >
              <option value="">{tr("notAssigned")}</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.name}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={tr("descriptionLabel")}>
              <Input
                value={value.description || ""}
                onChange={(event) =>
                  setValue({ ...value, description: event.target.value })
                }
              />
            </Field>
          </div>
        </div>
        {reservation?.status === "dhcp" && (
          <p className="rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-muted-foreground">
            {tr("dhcpAddressHint")}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tr("cancel")}
          </Button>
          <Button onClick={() => onSave(value)} disabled={saving}>
            <Pencil />
            {tr("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function prefixFormValue(prefix: Prefix) {
  return {
    name: prefix.name,
    gateway: prefix.gateway || "",
    dhcpStart: prefix.dhcp_start || "",
    dhcpEnd: prefix.dhcp_end || "",
    dns: (prefix.dns_servers || []).join(", "),
    vlan: prefix.vlan_id == null ? "" : String(prefix.vlan_id),
    bridge: prefix.bridge || "",
    proxmox_connection_id: prefix.proxmox_connection_id || "",
    description: prefix.description || "",
    status: prefix.status,
    role: prefix.role || "",
  };
}

export function EditPrefixDialog({
  prefix,
  open,
  onOpenChange,
  onSave,
  saving,
  error,
}: {
  prefix: Prefix;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (value: Partial<Prefix>) => void;
  saving: boolean;
  error?: string;
}) {
  const [baseline] = useState(() => prefixFormValue(prefix));
  const [value, setValue] = useState(baseline);
  const changedOnServer = JSON.stringify(prefixFormValue(prefix)) !== JSON.stringify(baseline);
  const inputErrors = prefixInputErrors(value.vlan, value.dhcpStart, value.dhcpEnd);
  const change = (key: keyof typeof value, next: string) =>
    setValue((current) => ({ ...current, [key]: next }));
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!saving) onOpenChange(next); }}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tr("editPrefix")}</DialogTitle>
          <DialogDescription>
            {tr("editPrefixDescription", { cidr: prefix.cidr })}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (saving || changedOnServer || inputErrors.length) return;
            onSave({
              name: value.name,
              gateway: value.gateway,
              dhcp_start: value.dhcpStart,
              dhcp_end: value.dhcpEnd,
              dns_servers: value.dns.split(",").map((item) => item.trim()).filter(Boolean),
              vlan_id: value.vlan.trim() ? Number(value.vlan.trim()) : null,
              bridge: value.bridge,
              proxmox_connection_id: value.proxmox_connection_id,
              description: value.description,
              status: value.status,
              role: value.role,
            });
          }}
        >
          {changedOnServer && <p role="alert" className="text-sm text-destructive">{tr("prefixChangedWhileEditing")}</p>}
          {inputErrors.map(key => <p key={key} role="alert" className="text-sm text-destructive">{tr(key)}</p>)}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <fieldset disabled={saving} className="grid gap-4 sm:grid-cols-2">
          <Field label={tr("name")}><Input required value={value.name} onChange={(event) => change("name", event.target.value)} /></Field>
          <Field label={tr("cidr")}><Input value={prefix.cidr} disabled /></Field>
          <Field label={tr("status")}>
            <select value={value.status} onChange={(event) => change("status", event.target.value)} className="h-8 w-full rounded-sm border bg-background px-2.5 text-[13px]">
              <option value="active">{tr("active")}</option><option value="container">{tr("container")}</option><option value="reserved">{tr("reserved")}</option><option value="deprecated">{tr("deprecated")}</option>
            </select>
          </Field>
          <Field label={tr("role")}><Input value={value.role} onChange={(event) => change("role", event.target.value)} /></Field>
          <Field label={tr("gateway")}><Input value={value.gateway} onChange={(event) => change("gateway", event.target.value)} /></Field>
          <Field label={tr("dhcpStart")}><Input inputMode="decimal" value={value.dhcpStart} onChange={(event) => change("dhcpStart", event.target.value)} placeholder="10.20.10.100" /></Field>
          <Field label={tr("dhcpEnd")}><Input inputMode="decimal" value={value.dhcpEnd} onChange={(event) => change("dhcpEnd", event.target.value)} placeholder="10.20.10.200" /></Field>
          <p className="sm:col-span-2 rounded-md border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">{tr("dhcpRangeHint")}</p>
          <Field label={tr("dnsServers")}><Input value={value.dns} onChange={(event) => change("dns", event.target.value)} placeholder="10.20.10.10, 10.20.10.11" /></Field>
          <Field label={tr("vlanId")}><Input inputMode="numeric" value={value.vlan} onChange={(event) => change("vlan", event.target.value)} /></Field>
          <PrefixConnectionSelect environmentId={prefix.environment_id} value={value.proxmox_connection_id} onChange={next => change("proxmox_connection_id", next)} />
          <Field label={tr("bridge")}><Input value={value.bridge} onChange={(event) => change("bridge", event.target.value)} /></Field>
          <div className="sm:col-span-2"><Field label={tr("descriptionLabel")}><Input value={value.description} onChange={(event) => change("description", event.target.value)} /></Field></div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>{tr("cancel")}</Button>
            <Button type="submit" disabled={saving || changedOnServer || inputErrors.length > 0}><Pencil />{tr("savePrefix")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

