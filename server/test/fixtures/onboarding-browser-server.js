'use strict';
// A real, fresh API for one browser-test attempt. The parent owns all temp paths.
const http = require('node:http');
const { createApp } = require('../../app');
const db = require('../../db');
const { app } = createApp({ isHttps: false });
const server = http.createServer(app);
server.listen(0, '127.0.0.1', () => process.send({ port: server.address().port }));
process.on('SIGTERM', () => {
  server.close(() => {
    db.db.close();
    process.exit(0);
  });
});
