import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  bytes, pct, uptime, CapacityLine, ObjectInfo,
  capacityToneForPercentage,
  taskDate,
  taskLabel,
  tasksForObject,
  type Cluster,
} from "./detail-model";

const cluster: Cluster = {
  id: "cluster-a",
  endpoint: "https://pve.example.test:8006",
  status: "online",
  connections: [{ id: "connection-a", name: "Primary Proxmox" }],
  nodes: [],
  vms: [],
};

describe("tasksForObject", () => {
  it("groups repeated successful platform synchronization tasks", () => {
    const tasks = tasksForObject([
      { action: "ipam.proxmox_sync", detail: "source_id=connection-a source=Primary Proxmox", success: 1, created_at: "2026-09-02T12:00:00Z" },
      { action: "ipam.proxmox_sync", detail: "source_id=connection-a source=Primary Proxmox", success: 1, created_at: "2026-09-02T11:00:00Z" },
    ], cluster);

    expect(tasks).toHaveLength(1);
    expect(taskLabel(tasks[0])).toBe("IPAM sync ×2");
  });

  it("limits node tasks to the requested node", () => {
    const tasks = tasksForObject([
      { action: "node.refresh", detail: "source_id=connection-a node=pve001", success: 1, created_at: "2026-09-02T12:00:00Z" },
      { action: "node.refresh", detail: "source_id=connection-a node=pve002", success: 1, created_at: "2026-09-02T11:00:00Z" },
    ], cluster, "pve001");

    expect(tasks).toHaveLength(1);
    expect(tasks[0].detail).toContain("pve001");
  });
});

describe("infrastructure status presentation", () => {
  it("keeps sub-threshold capacity neutral and aligns warnings with health checks", () => {
    expect(capacityToneForPercentage(82)).toBe("healthy");
    expect(capacityToneForPercentage(85)).toBe("warning");
    expect(capacityToneForPercentage(95)).toBe("critical");
  });

  it("uses the shared unambiguous date formatter for grouped tasks", () => {
    expect(taskDate("2026-09-02T17:30:00.000Z")).toMatch(/^2 Sept? 2026, 19:30$/);
  });
});

it('keeps unknown synchronization results separate from confirmed successful records',()=>{
 const tasks=tasksForObject([
  {action:'ipam.proxmox_sync',detail:'source_id=connection-a source=Primary Proxmox',success:1,created_at:'2026-09-02T12:00:00Z'},
  {action:'ipam.proxmox_sync',detail:'source_id=connection-a source=Primary Proxmox',created_at:'2026-09-02T11:00:00Z'},
  {action:'ipam.proxmox_sync',detail:'source_id=connection-a source=Primary Proxmox',created_at:'2026-09-02T10:00:00Z'},
 ],cluster);
 expect(tasks).toHaveLength(3);
 expect(tasks.every(task=>!task.grouped_count)).toBe(true);
});

it('matches stable platform and exact node identities, never display-name substrings', () => {
 const records = [
  {action:'infrastructure.vm_power',detail:'source_id=connection-a node=pve001 source="Old platform name"'},
  {action:'infrastructure.vm_power',detail:'source_id=connection-a node=pve0010'},
  {action:'infrastructure.vm_power',detail:'source_id=connection-b node=pve001 source="Primary Proxmox"'},
  {action:'infrastructure.vm_power',detail:'source="Primary Proxmox" node=pve001'},
  {action:'infrastructure.vm_power',detail:'source_id=connection-a node=pve002 vm=pve001'},
  {action:'infrastructure.vm_power',detail:'source_id=connection-a source_id=connection-b node=pve001'},
 ];
 expect(tasksForObject(records,cluster,'pve001')).toEqual([records[0]]);
 expect(tasksForObject(records,cluster)).toEqual([records[0],records[1],records[4]]);
});

it('distinguishes missing measurements from zero and short uptimes', () => {
  expect(bytes(0)).toBe('0 B');
  expect(bytes(Number.NaN)).toBe('—');
  expect(pct(Number.NaN, 100)).toBe('—');
  expect(pct(0, 100)).toBe('0 %');
  expect(pct(10, Number.POSITIVE_INFINITY)).toBe('—');
  expect(uptime(Number.NaN)).toBe('—');
  expect(uptime(-1)).toBe('—');
  expect(uptime(0)).toBe('0 min');
  expect(uptime(180)).toBe('3 min');
});


describe('capacity measurement states', () => {
  it('explains missing usage without emitting a zero or NaN progress bar', () => {
    const html = renderToStaticMarkup(<CapacityLine label="CPU" used={NaN} total={8} unit="cores" />);
    expect(html).toContain('Unavailable');
    expect(html).toContain('not reported');
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('console-capacity-track');
  });
  it('preserves a measured zero as valid idle capacity', () => {
    const html = renderToStaticMarkup(<CapacityLine label="CPU" used={0} total={8} unit="cores" />);
    expect(html).toContain('0.00 / 8 cores');
    expect(html).toContain('console-capacity-track');
    expect(html).not.toContain('Unavailable');
  });
});


it('shows a known zero object count instead of an unknown placeholder', () => {
  const html = renderToStaticMarkup(<ObjectInfo label="Host operations enabled" value={0} />);
  expect(html).toContain('>0</div>');
  expect(html).not.toContain('—');
  expect(renderToStaticMarkup(<ObjectInfo label="Endpoint" value="" />)).toContain('—');
});
