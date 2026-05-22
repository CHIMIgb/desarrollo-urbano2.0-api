const express = require('express');
const { rateLimit } = require('express-rate-limit');

const app = express();

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  handler: async (req, res) => {
    await new Promise(r => setTimeout(r, 100));
    res.status(403).json({ error: 'limit reached from async handler' });
  }
});

app.use(limiter);

app.get('/', (req, res) => {
  res.json({ ok: true });
});

const server = app.listen(3001, async () => {
  console.log('Test server on 3001');
  
  for (let i = 0; i < 4; i++) {
    const res = await fetch('http://localhost:3001/');
    console.log(`Req ${i+1}: ${res.status}`);
  }
  
  server.close();
});
