const express = require('express');
const { ipKeyGenerator } = require('express-rate-limit');

const app = express();

app.get('/', (req, res) => {
  res.json({ ip: req.ip, key: ipKeyGenerator(req, res) });
});

const server = app.listen(3001, async () => {
  try {
    const fetch = require('node-fetch'); // if needed, but native fetch should work
  } catch(e) {}
  const res = await fetch('http://localhost:3001/');
  console.log(await res.text());
  server.close();
});
