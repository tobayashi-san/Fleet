'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {once} = require('node:events');

test('real SMTP transport delivers a notification and records receiver rejection', {timeout:15000}, async () => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'fleet-smtp-'));
  process.env.NODE_ENV='test'; process.env.DB_PATH=path.join(root,'test.db');
  const db=require('../../db');
  let received='', rejectRecipient=false;
  const sockets=new Set();
  const server=net.createServer(socket=>{
    sockets.add(socket);socket.on('close',()=>sockets.delete(socket));
    socket.setEncoding('utf8');socket.write('220 localhost isolated test receiver\r\n');
    let buffer='', dataMode=false;
    socket.on('data',chunk=>{
      buffer+=chunk;
      while(buffer.includes('\r\n')) {
        const end=buffer.indexOf('\r\n');const line=buffer.slice(0,end);buffer=buffer.slice(end+2);
        if(dataMode) {
          if(line==='.') {dataMode=false;socket.write('250 Message accepted\r\n');}
          else received+=line+'\n';
        } else if(/^EHLO|^HELO/.test(line)) socket.write('250 localhost\r\n');
        else if(line==='STARTTLS') socket.write('502 TLS unavailable in test relay\r\n');
        else if(/^RCPT/.test(line)) socket.write(rejectRecipient?'550 Test recipient rejected\r\n':'250 Recipient accepted\r\n');
        else if(line==='DATA') {dataMode=true;socket.write('354 End with dot\r\n');}
        else if(line==='QUIT') socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  try {
    server.listen(0,'127.0.0.1');await once(server,'listening');
    for(const [key,value] of Object.entries({smtp_host:'127.0.0.1',smtp_port:String(server.address().port),smtp_from:'fleet@example.invalid',smtp_to:'receiver@example.invalid'})) db.settings.set(key,value);
    const {sendEmail}=require('../../services/notifier');
    assert.deepEqual(await sendEmail('Review notification','Local SMTP delivery verified',true),{ok:true,partial:false});
    assert.match(received,/Local SMTP delivery verified/);
    assert.match(received,/receiver@example.invalid/);
    assert.equal(db.db.prepare('SELECT status FROM notification_deliveries ORDER BY rowid DESC LIMIT 1').get().status,'accepted');
    const before=received;
    db.settings.set('smtp_security','starttls');
    await assert.rejects(sendEmail('TLS-required notification','Must not be sent in clear text',false));
    assert.equal(received,before);
    db.settings.set('smtp_security','plain');
    assert.deepEqual(await sendEmail('Explicit lab relay','Unencrypted relay explicitly selected',true),{ok:true,partial:false});
    assert.match(received,/Unencrypted relay explicitly selected/);
    rejectRecipient=true;
    await assert.rejects(sendEmail('Rejected review notification','Must be rejected',false));
    assert.equal(db.db.prepare('SELECT status FROM notification_deliveries ORDER BY rowid DESC LIMIT 1').get().status,'failed');
  } finally {
    for(const socket of sockets) socket.destroy();
    await new Promise(resolve=>server.close(resolve));
    db.db.close();fs.rmSync(root,{recursive:true,force:true});
  }
});
