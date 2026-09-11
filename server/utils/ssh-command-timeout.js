/** Bound a single SSH channel without closing the shared connection. */
async function execCommandWithTimeout(ssh, command, timeoutMs) {
  let channel;
  let expired = false;
  let timer;
  const stop = () => {
    try { channel?.signal('TERM'); } catch { /* Channel may already be closed. */ }
    try { channel?.destroy(); } catch { /* Best effort channel cleanup. */ }
  };
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => {
      expired = true;
      const error = new Error(`SSH check exceeded ${timeoutMs / 1000} seconds.`);
      error.code = 'SSH_CHECK_TIMEOUT';
      reject(error);
      stop();
    }, timeoutMs);
    timer.unref?.();
  });
  try {
    return await Promise.race([
      ssh.execCommand(command, { onChannel: value => {
        channel = value;
        // Let node-ssh install its close/error listeners before stopping a late channel.
        if (expired) queueMicrotask(stop);
      } }),
      deadline,
    ]);
  } finally { clearTimeout(timer); }
}
module.exports = { execCommandWithTimeout };
