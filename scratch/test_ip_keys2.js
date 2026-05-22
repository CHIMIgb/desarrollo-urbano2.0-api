const express = require('express');
const { ipKeyGenerator } = require('express-rate-limit');

const app = express();

app.get('/', (req, res) => {
  res.send(`IP: ${req.ip}, Key: ${ipKeyGenerator(req, res)}`);
});

const server = app.listen(3001, async () => {
  for(let i=0; i<3; i++) {
    const res = await fetch('http://localhost:3001/');
    console.log(await res.text());
  }
  server.close();
});
