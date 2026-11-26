'use strict';

// Provider use is opt-in; all database and SMTP settings remain isolated.
const liveAI = process.argv.includes('--ai');
if (liveAI) {
  const config = require('dotenv').config({ path: 'D:/Thieu/StudentJob_Marketplace/.env', override: true, quiet: true });
  if (config.error || ['API_KEY', 'BASE_URL', 'MODEL_NAME'].some((key) => !process.env[key])) {
    console.error('Demo AI configuration is unavailable.');
    process.exit(1);
  }
} else {
  Object.assign(process.env, { API_KEY: '', BASE_URL: '', MODEL_NAME: '' });
}
Object.assign(process.env, {
  DB_HOST: '127.0.0.1', DB_PORT: '33481', DB_USER: 'studentjob_demo',
  DB_PASSWORD: 'demo-only', DB_NAME: 'studentjob_marketplace',
  JWT_SECRET: 'studentjob-local-demo-only',
  SMTP_HOST: '', SMTP_USER: '', SMTP_PASS: '', EMAIL_FROM: '',
});
// Optional per-process limit for controlled smoke tests, not a production quota.
if (process.argv.includes('--attempt-limit=4')) {
  const originalFetch = global.fetch;
  let attempts = 0;
  let stopped = false;
  global.fetch = async (...args) => {
    if (stopped || attempts >= 4) throw new Error('Demo test provider limit reached');
    attempts++;
    const started = Date.now();
    try {
      const response = await originalFetch(...args);
      console.log(`Demo provider attempt ${attempts}: HTTP ${response.status}, ${Date.now() - started} ms`);
      if (response.status === 401 || response.status === 403) stopped = true;
      return response;
    } catch {
      stopped = true;
      console.log(`Demo provider attempt ${attempts}: transport failure, ${Date.now() - started} ms`);
      throw new Error('Demo provider transport failed');
    }
  };
}
const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: 'http://127.0.0.1:35173', methods: ['GET', 'POST'] } });
require('./src/sockets/chatSocket')(io);
server.listen(5000, '127.0.0.1', () => console.log('Local demo API listening on 127.0.0.1:5000'));
