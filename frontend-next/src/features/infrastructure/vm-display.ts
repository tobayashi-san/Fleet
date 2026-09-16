export function guestOsLabel(value?: string | null) {
  if (!value) return 'Not reported';
  return ({l26: 'Linux (kernel 2.6 or newer)', l24: 'Linux (kernel 2.4)', win11: 'Windows 11 / Server 2022 or newer', win10: 'Windows 10 / Server 2016–2019', win8: 'Windows 8 / Server 2012', win7: 'Windows 7 / Server 2008 R2', other: 'Other operating system', solaris: 'Solaris'} as Record<string,string>)[value] || value;
}
export function bootOrderLabel(value?: string | null) {
  if (!value) return 'Proxmox default';
  if (!value.startsWith('order=')) return value;
  return value.slice(6).split(';').map(device => device.replace(/^scsi(\d+)$/, 'SCSI disk $1').replace(/^virtio(\d+)$/, 'VirtIO disk $1').replace(/^sata(\d+)$/, 'SATA disk $1').replace(/^ide(\d+)$/, 'IDE device $1').replace(/^net(\d+)$/, 'Network adapter $1')).join(' → ');
}
