const test = require('node:test');
const assert = require('node:assert/strict');
const Database = require('better-sqlite3');
const { applySchema } = require('../db/schema');
const { applyMigrations, CURRENT_SCHEMA_VERSION } = require('../db/migrations');

test('database migrations are transactional, versioned, and idempotent', () => {
  const db = new Database(':memory:');
  try {
    applySchema(db);
    applyMigrations(db);
    applyMigrations(db);

    const versions = db.prepare('SELECT version FROM schema_migrations ORDER BY version').all();
    assert.deepEqual(versions, [{ version: CURRENT_SCHEMA_VERSION }]);
    assert.equal(db.inTransaction, false);
  } finally {
    db.close();
  }
});

test('database migrations preserve rows, restore legacy columns and drop retired tables', () => {
  const db = new Database(':memory:');
  try {
    applySchema(db);
    db.prepare(`INSERT INTO servers (id, name, hostname, ip_address)
      VALUES ('legacy-server', 'Legacy server', 'legacy-server', '10.0.0.8')`).run();
    db.exec(`CREATE TABLE maintenance_windows (id TEXT PRIMARY KEY)`);
    db.prepare("INSERT INTO app_settings (key, value) VALUES ('notify_suppress_maintenance', '1')").run();
    db.exec('ALTER TABLE servers DROP COLUMN host_fingerprint');
    db.exec('ALTER TABLE servers DROP COLUMN docker_enabled');

    applyMigrations(db);

    const columns = new Set(db.prepare('PRAGMA table_info(servers)').all().map((column) => column.name));
    assert.equal(columns.has('host_fingerprint'), true);
    assert.equal(columns.has('docker_enabled'), true);
    assert.equal(db.prepare('SELECT name FROM servers WHERE id = ?').get('legacy-server').name, 'Legacy server');
    assert.equal(db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'maintenance_windows'").get(), undefined);
    assert.equal(db.prepare("SELECT value FROM app_settings WHERE key = 'notify_suppress_maintenance'").get(), undefined);
  } finally {
    db.close();
  }
});

test('database migrations rename the untouched legacy default environment', () => {
  const db = new Database(':memory:');
  try {
    applySchema(db);
    db.prepare("UPDATE environments SET name = 'Standardumgebung' WHERE id = 'default'").run();

    applyMigrations(db);

    assert.equal(db.prepare("SELECT name FROM environments WHERE id = 'default'").get().name, 'Default environment');
  } finally {
    db.close();
  }
});

test('database migrations keep a legacy default name when the replacement name is already taken', () => {
  const db = new Database(':memory:');
  try {
    applySchema(db);
    db.prepare("UPDATE environments SET name = 'Standardumgebung' WHERE id = 'default'").run();
    db.prepare("INSERT INTO environments (id, name) VALUES ('existing-english', 'Default environment')").run();

    applyMigrations(db);

    assert.equal(db.prepare("SELECT name FROM environments WHERE id = 'default'").get().name, 'Standardumgebung');
  } finally {
    db.close();
  }
});

test('database migrations rename the untouched legacy product name', () => {
  const db = new Database(':memory:');
  try {
    applySchema(db);
    db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('wl_app_name', 'Shipyard')").run();

    applyMigrations(db);

    assert.equal(db.prepare("SELECT value FROM app_settings WHERE key = 'wl_app_name'").get().value, 'Fleet');
  } finally {
    db.close();
  }
});

test('database migrations keep agent URLs stored under the previous product name', () => {
  const db = new Database(':memory:');
  try {
    applySchema(db);
    db.exec('ALTER TABLE agent_config ADD COLUMN shipyard_url TEXT');
    db.prepare("INSERT INTO servers (id, name, hostname, ip_address) VALUES ('agent-host', 'agent-host', 'agent-host', '10.0.0.9')").run();
    db.prepare("INSERT INTO agent_config (server_id, token, shipyard_url) VALUES ('agent-host', 'token', 'https://manager.example')").run();

    applyMigrations(db);

    assert.equal(db.prepare("SELECT fleet_url FROM agent_config WHERE server_id = 'agent-host'").get().fleet_url, 'https://manager.example');
  } finally {
    db.close();
  }
});

test('database migrations fail loudly and roll back when required schema is corrupt', () => {
  const db = new Database(':memory:');
  try {
    db.exec('CREATE TABLE servers (id TEXT PRIMARY KEY)');
    assert.throws(() => applyMigrations(db), /Database migration failed: required column 'servers\.name' is missing/);
    assert.equal(db.inTransaction, false);
    assert.equal(db.prepare("SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'").get().count, 0);
  } finally {
    db.close();
  }
});

test('custom-check metadata migration preserves historical successful results', () => {
 const db = new Database(':memory:');
 try {
   applySchema(db);
   db.prepare("INSERT INTO servers (id,name,hostname,ip_address) VALUES ('host','Host','host','192.0.2.1')").run();
   db.prepare("INSERT INTO custom_update_tasks (id,server_id,name,current_version,last_version,has_update,last_checked_at) VALUES ('task','host','Task','1','2',1,'2026-01-01 00:00:00')").run();
   applyMigrations(db);
   const task=db.prepare('SELECT * FROM custom_update_tasks WHERE id = ?').get('task');
   assert.equal(task.current_version,'1');
   assert.equal(task.last_version,'2');
   assert.equal(task.has_update,1);
   assert.equal(task.last_checked_at,'2026-01-01 00:00:00');
   assert.equal(task.last_check_error,null);
   assert.equal(task.last_attempted_at,null);
 } finally { db.close(); }
});

test('legacy host history retains rows and names after migration and host deletion', () => {
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys = ON');
    applySchema(db);
    db.exec(`DROP TABLE update_history;
      CREATE TABLE update_history (id TEXT PRIMARY KEY, server_id TEXT NOT NULL, environment_id TEXT NOT NULL DEFAULT 'default', action TEXT NOT NULL, status TEXT DEFAULT 'pending', output TEXT, started_at TEXT DEFAULT (datetime('now')), completed_at TEXT, triggered_by TEXT, FOREIGN KEY(server_id) REFERENCES servers(id) ON DELETE CASCADE);
      INSERT INTO servers(id,name,hostname,ip_address) VALUES('old-host','Original host','old-host','192.0.2.10');
      INSERT INTO update_history(id,server_id,action,output) VALUES('old-run','old-host','system_update','Original output');`);
    applyMigrations(db);applyMigrations(db);
    db.prepare('DELETE FROM servers WHERE id=?').run('old-host');
    const row=db.prepare('SELECT * FROM update_history WHERE id=?').get('old-run');
    assert.equal(row.server_name_snapshot,'Original host');assert.equal(row.output,'Original output');
    assert.equal(row.environment_id,'default');
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
    assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='idx_update_history_server_id'").get());
  } finally {db.close();}
});

test('legacy workflow migration does not infer historical identities from reused names',()=>{
 const db=new Database(':memory:');
 try {
  applySchema(db);db.exec('ALTER TABLE schedule_history DROP COLUMN target_server_ids');
  db.exec("INSERT INTO servers(id,name,hostname,ip_address) VALUES('replacement','database','database','192.0.2.1'); INSERT INTO schedule_history(id,schedule_name,playbook,targets,output) VALUES('legacy','Old run','update.yml','database','Old output')");
  applyMigrations(db);applyMigrations(db);
  const row=db.prepare("SELECT * FROM schedule_history WHERE id='legacy'").get();
  assert.equal(row.target_server_ids,null);assert.equal(row.output,'Old output');assert.equal(row.targets,'database');
 } finally {db.close();}
});
