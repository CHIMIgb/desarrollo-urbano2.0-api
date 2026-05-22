const express = require('express');
const { ipKeyGenerator } = require('express-rate-limit');

const app = express();

app.get('/', (req, res) => {
  const key = ipKeyGenerator(req, res);
  res.json({ ip: req.ip, keyType: typeof key, key: JSON.stringify(key) });
});

const server = app.listen(3001, async () => {
  for(let i=0; i<3; i++) {
    const res = await fetch('http://localhost:3001/');
    console.log(await res.text());
  }
  server.close();
});
