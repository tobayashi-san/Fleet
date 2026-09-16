'use strict';
const { createHash } = require('node:crypto');
const { AsyncLocalStorage } = require('node:async_hooks');
const context = new AsyncLocalStorage();

function inventory(value) {
  if (Array.isArray(value)) return value.map(inventory);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([key]) => !/usage|used|uptime|load|timestamp|updated|available|free/i.test(key)).map(([key, item]) => [key, inventory(item)]));
}
function pendingChanges(value) {
  if (!value || typeof value !== 'object') return false;
  return value.has_update === true || value.status === 'update_available' || value.reboot_required === true || Object.values(value).some(pendingChanges);
}

// Shared by scheduled and interactive collection. No state-changing jobs belong here.
class CollectionQueue {
  constructor({ concurrency = 4, heavyConcurrency = 1, maxPending = 10000, now = Date.now, random = Math.random } = {}) {
    Object.assign(this, { concurrency, heavyConcurrency, maxPending, now, random });
    this.pending = []; this.jobs = new Map(); this.states = new Map(); this.hosts = new Set(); this.active = 0; this.heavy = 0;
  }
  key(kind, host) { return `${host.id}:${kind}`; }
  due(kind, host, { active = false } = {}) {
    const state = this.states.get(this.key(kind, host));
    const info = this.states.get(this.key('info', host));
    if (kind !== 'info' && info?.failures && this.now() < info.nextAt) return false;
    if (active && kind === 'info' && state?.lastSuccess && !state.failures) return this.now() >= state.lastSuccess + 60000;
    return this.now() >= (state?.nextAt || 0);
  }
  run(kind, host, work, { priority = 0, baseMs = 300000, heavy = kind !== 'info' } = {}) {
    const key = this.key(kind, host);
    const existing = this.jobs.get(key);
    if (existing) { existing.priority = Math.max(existing.priority, priority); return existing.promise; }
    if (this.pending.length >= this.maxPending) return Promise.reject(Object.assign(new Error('Collection queue is full. Retry shortly.'), {code:'COLLECTION_QUEUE_FULL'}));
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    const job = { key, host: String(host.id), work, priority, baseMs, heavy, resolve, reject, promise, queuedAt: this.now() };
    this.jobs.set(key, job); this.pending.push(job); this.drain(); return promise;
  }
  drain() {
    while (this.active < this.concurrency) {
      // Ageing prevents a busy console from starving background checks.
      const candidates = this.pending.filter(job => !this.hosts.has(job.host) && (!job.heavy || this.heavy < this.heavyConcurrency));
      candidates.sort((a,b) => (b.priority + (this.now()-b.queuedAt)/30000) - (a.priority + (this.now()-a.queuedAt)/30000));
      const job = candidates[0]; if (!job) break;
      this.pending.splice(this.pending.indexOf(job),1); this.active++; this.heavy += Number(job.heavy); this.hosts.add(job.host);
      Promise.resolve().then(() => context.run({ collection: true }, job.work)).then(value => {
        const previous = this.states.get(job.key);
        // Ignore continuously changing utilisation when deciding whether host inventory is stable.
        const payload = job.key.endsWith(':info') && value ? inventory(value) : value;
        const signature = createHash('sha256').update(JSON.stringify(payload) ?? 'null').digest('hex');
        const stable = !(job.key.endsWith(':updates') && Array.isArray(value) && value.length) && !pendingChanges(value) && previous?.signature === signature ? Math.min((previous.stable || 0)+1, 2) : 0;
        this.states.set(job.key,{ signature, stable, failures:0, lastSuccess:this.now(), nextAt:this.now()+job.baseMs * 2 ** stable * (1+this.random()*0.1) });
        return value;
      }).then(job.resolve, error => {
        const failures = Math.min((this.states.get(job.key)?.failures || 0)+1, 5);
        this.states.set(job.key,{ failures, stable:0, nextAt:this.now()+Math.min(job.baseMs * 2 ** failures, Math.max(job.baseMs, job.key.endsWith(':info') ? 3600000 : 86400000))*(1+this.random()*0.1) });
        job.reject(error);
      }).finally(() => { this.active--; this.heavy -= Number(job.heavy); this.hosts.delete(job.host); this.jobs.delete(job.key); this.drain(); });
    }
  }
  resetSchedule() { this.states.clear(); }
  prune(hostIds) { const ids = new Set(hostIds.map(String)); for (const [key] of this.states) if (!ids.has(key.slice(0,key.lastIndexOf(':')))) this.states.delete(key); }
  snapshot() { return { running:this.active, queued:this.pending.length, limit:this.concurrency, heavyRunning:this.heavy, heavyLimit:this.heavyConcurrency }; }
}
const collectionQueue = new CollectionQueue();
module.exports = { CollectionQueue, collectionQueue, collectionContext: context };
