'use strict';

// Read only a uniquely identified guest from the persisted inventory snapshot.
function inventoryGuestName(serialized, mapping) {
  try {
    const snapshot = JSON.parse(serialized || 'null');
    const matches = (snapshot?.clusters || [])
      .filter(cluster => cluster.connections?.some(source => source.id === mapping.connection_id))
      .flatMap(cluster => cluster.vms || [])
      .filter(vm => vm.node_name === mapping.node_name && String(vm.vm_id) === String(mapping.vm_id)
        && (vm.guest_type || 'qemu') === (mapping.guest_type || 'qemu'));
    return matches.length === 1 && typeof matches[0].name === 'string' && matches[0].name.trim()
      ? matches[0].name : null;
  } catch { return null; }
}
module.exports = { inventoryGuestName };
