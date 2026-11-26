'use strict';

// Isolated local demo only: never load owner database, provider or SMTP settings.
Object.assign(process.env, {
  DB_HOST: '127.0.0.1', DB_PORT: '33481', DB_USER: 'studentjob_demo',
  DB_PASSWORD: 'demo-only', DB_NAME: 'studentjob_marketplace',
  JWT_SECRET: 'studentjob-local-demo-only', API_KEY: '', BASE_URL: '', MODEL_NAME: '',
  SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', EMAIL_FROM: '',
});
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://127.0.0.1:35173', methods: ['GET', 'POST'] } });
require('./src/sockets/chatSocket')(io);
server.listen(5000, '127.0.0.1', () => console.log('Local demo API listening on 127.0.0.1:5000'));
