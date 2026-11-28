const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { io: client } = require('../../frontend/node_modules/socket.io-client');

test('blocked student sockets are disconnected and stale connections rejected', async () => {
  assert.equal(process.env.DB_HOST, '127.0.0.1');
  assert.equal(process.env.DB_PORT, '3307');
  assert.equal(process.env.DB_NAME, 'studentjob_marketplace');
  process.env.JWT_SECRET = 'synthetic-test-only-secret';
  const pool = require('../src/config/db');
  const server = http.createServer();
  const io = new Server(server);
  require('../src/sockets/chatSocket')(io);
  server.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const token = jwt.sign({ id: 1, role: 'STUDENT' }, process.env.JWT_SECRET);
  const event = (socket, name) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error(`Timeout waiting for ${name}`)), 5000);
    socket.once(name, value => { clearTimeout(timer); resolve(value); });
  });
  let socket, stale;
  try {
    socket = client(url, { auth: { token }, reconnection: false, autoConnect: false });
    const connected = event(socket, 'connect'); socket.connect(); await connected;
    await pool.execute("UPDATE users SET status='BLOCKED' WHERE id=1");
    const disconnected = event(socket, 'disconnect'); socket.emit('joinConversation', 1); await disconnected;
    stale = client(url, { auth: { token }, reconnection: false, autoConnect: false });
    const rejected = event(stale, 'connect_error'); stale.connect(); assert.ok(await rejected);
  } finally {
    await pool.execute("UPDATE users SET status='ACTIVE' WHERE id=1");
    if (socket) socket.disconnect();
    if (stale) stale.disconnect();
    await new Promise(resolve => io.close(resolve));
    await pool.end();
  }
});
