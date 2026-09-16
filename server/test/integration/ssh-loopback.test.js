'use strict';

// Real OpenSSH/SFTP transport, restricted to loopback and temporary files.
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const {spawn, execFileSync} = require('node:child_process');
const {once} = require('node:events');
const {Readable} = require('node:stream');

test('real OpenSSH lists, uploads and downloads binary files and runs a shell command', {timeout:30000}, async () => {
  const root = fs.mkdtempSync(path.join(os.homedir(), '.shipyard-ssh-loopback-'));
  let daemon, manager, db, terminalServer, terminalClient;
  let diagnostic = '';
  try {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'loopback-terminal-test-secret';
    process.env.DB_PATH = path.join(root, 'test.db');
    process.env.SHIPYARD_SSH_DIR = path.join(root, 'keys');
    process.env.SHIPYARD_KEY_SECRET = 'isolated-loopback-test-key';
    fs.mkdirSync(process.env.SHIPYARD_SSH_DIR);
    const hostKey = path.join(root, 'host');
    const clientKey = path.join(process.env.SHIPYARD_SSH_DIR, 'client');
    for (const key of [hostKey, clientKey]) execFileSync('ssh-keygen', ['-q','-t','ed25519','-N','','-f',key]);
    const listener = net.createServer();
    listener.listen(0, '127.0.0.1'); await once(listener, 'listening');
    const port = listener.address().port;
    await new Promise(resolve => listener.close(resolve));
    const config = path.join(root, 'sshd_config');
    fs.writeFileSync(config, [
      `Port ${port}`, 'ListenAddress 127.0.0.1', `HostKey ${hostKey}`,
      `PidFile ${root}/sshd.pid`, `AuthorizedKeysFile ${clientKey}.pub`,
      'StrictModes yes', 'PasswordAuthentication no', 'KbdInteractiveAuthentication no',
      'UsePAM no', 'PermitRootLogin no', `AllowUsers ${os.userInfo().username}`,
      'AllowTcpForwarding no', 'X11Forwarding no', 'PermitTunnel no',
      'Subsystem sftp internal-sftp', 'LogLevel VERBOSE',
    ].join('\n')+'\n');
    daemon = spawn('/usr/bin/sshd', ['-D','-e','-f',config], {stdio:['ignore','ignore','pipe']});
    daemon.stderr.on('data', chunk => { diagnostic += chunk; });
    await new Promise((resolve,reject) => {
      const timer = setTimeout(() => reject(new Error('OpenSSH startup timeout: '+diagnostic)), 5000);
      daemon.once('error', error => {clearTimeout(timer);reject(error);});
      daemon.once('exit', code => {clearTimeout(timer);reject(new Error(`OpenSSH exited ${code}: ${diagnostic}`));});
      daemon.stderr.on('data', () => {if(diagnostic.includes('Server listening on')) {clearTimeout(timer);resolve();}});
    });
    db = require('../../db');
    manager = require('../../services/ssh-manager');
    db.sshKeys.create('client', fs.readFileSync(clientKey+'.pub','utf8'), clientKey);
    const host = db.servers.create({name:'Loopback integration',hostname:'loopback',ip_address:'127.0.0.1',ssh_port:port,ssh_user:os.userInfo().username});
    const file = path.join(root,'binary payload.dat');
    const payload = Buffer.from(Array.from({length:65537}, (_,i)=>i%256));
    await manager.uploadStream(host,file,Readable.from([payload]));
    assert.deepEqual(fs.readFileSync(file),payload);
    const listing = await manager.listFiles(host,root);
    assert.equal(listing.entries.find(entry=>entry.name==='binary payload.dat')?.size,payload.length);
    const chunks=[];
    for await (const chunk of await manager.createReadStream(host,file)) chunks.push(chunk);
    assert.deepEqual(Buffer.concat(chunks),payload);
    const ssh = await manager.getConnection(host);
    const result = await ssh.execCommand("printf 'shipyard-loopback-shell-ok'");
    assert.equal(result.code,0);
    assert.equal(result.stdout,'shipyard-loopback-shell-ok');
    assert.ok(db.servers.getHostFingerprint(host.id));
    const {WebSocketServer,WebSocket} = require('ws');
    terminalServer = new WebSocketServer({port:0,host:'127.0.0.1'});
    require('../../ws/ssh-terminal').attachSshTerminal(terminalServer);
    await once(terminalServer,'listening');
    const user = db.users.create('loopback-operator',null,'unused-test-hash','admin');
    const token = require('jsonwebtoken').sign({userId:user.id,tv:user.token_version||0},process.env.JWT_SECRET,{expiresIn:'1m'});
    terminalClient = new WebSocket(`ws://127.0.0.1:${terminalServer.address().port}/ws/ssh?serverId=${host.id}&output=json-v1&token=${token}`);
    await new Promise((resolve,reject) => {
      const timer=setTimeout(()=>reject(new Error('Interactive terminal output timeout')),5000);
      let output='';
      terminalClient.on('error',error=>{clearTimeout(timer);reject(error);});
      terminalClient.on('message',data=>{
        const frame=JSON.parse(data.toString());
        if(frame.type==='error') {clearTimeout(timer);reject(new Error(frame.message));}
        if(frame.type==='ready') terminalClient.send(JSON.stringify({type:'input',data:"printf 'shipyard-%s-ok\\n' 'interactive'\n"}));
        if(frame.type==='output') {
          output+=frame.data;
          if(output.includes('shipyard-interactive-ok')) {clearTimeout(timer);resolve();}
        }
      });
    });
    const closed=once(terminalClient,'close');terminalClient.close();await closed;
    assert.ok(db.db.prepare("SELECT 1 FROM audit_log WHERE action='terminal.connect'").get());
    manager.closeAll();
    const rejectedKey = path.join(process.env.SHIPYARD_SSH_DIR, 'rejected');
    execFileSync('ssh-keygen', ['-q','-t','ed25519','-N','','-f',rejectedKey]);
    db.sshKeys.replace('rejected',fs.readFileSync(rejectedKey+'.pub','utf8'),rejectedKey);
    await assert.rejects(manager.createTransferConnection(host), error => error.code !== 'HOST_KEY_MISMATCH' && /authentication/i.test(error.message));
    await assert.rejects(manager.getConnection(host), error => error.code !== 'HOST_KEY_MISMATCH' && /authentication/i.test(error.message));
    db.sshKeys.replace('client',fs.readFileSync(clientKey+'.pub','utf8'),clientKey);
    db.servers.setHostFingerprint(host.id,'SHA256:deliberately-different-test-key');
    await assert.rejects(manager.createTransferConnection(host), {code:'HOST_KEY_MISMATCH'});
  } catch (error) {
    throw new Error(`${error.message}\nOpenSSH: ${diagnostic}`, {cause:error});
  } finally {
    terminalClient?.terminate();
    if(terminalServer) {for(const client of terminalServer.clients) client.terminate();await new Promise(resolve=>terminalServer.close(resolve));}
    manager?.closeAll();
    if(daemon && daemon.exitCode===null) {const ended=once(daemon,'exit');daemon.kill('SIGTERM');await ended;}
    db?.db.close();
    fs.rmSync(root,{recursive:true,force:true});
  }
});
