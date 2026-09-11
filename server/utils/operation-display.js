function operationName(action, source) {
  const exact = { system_update: 'Install OS updates', system_update_all: 'Install all OS updates', reboot: 'Restart host' };
  if (exact[action]) return exact[action];
  const prefixes = { 'compose_pull_': 'Pull container images', 'compose_up_': 'Start container stack', 'compose_down_': 'Stop container stack', 'compose_restart_': 'Restart container stack', 'restart_docker_': 'Restart container', 'custom_update:': 'Run custom update', 'ansible:': 'Run playbook' };
  for (const [prefix, label] of Object.entries(prefixes)) {
    if (String(action).startsWith(prefix)) return `${label} · ${action.slice(prefix.length)}`;
  }
  if (source === 'Deployment') {
    const label = ({ plan: 'Preview infrastructure changes', apply: 'Apply infrastructure changes', destroy: 'Destroy managed infrastructure', refresh: 'Refresh infrastructure state', init: 'Initialize deployment', 'check-drift': 'Check infrastructure drift', drift: 'Check infrastructure drift', import: 'Import existing infrastructure' })[action];
    if (label) return label;
  }
  return String(action || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[._:-]+/g, ' ').trim().replace(/^./, letter => letter.toUpperCase()) || 'Operation';
}
function timestamp(value) {
  const text = String(value || '');
  return Date.parse(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(text) ? text.replace(' ', 'T') + 'Z' : text);
}
module.exports = { operationName, timestamp };
