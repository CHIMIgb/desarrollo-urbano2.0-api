const BASE_URL = 'http://localhost:3000/api/v1/';

async function run() {
  for (let i = 0; i < 15; i++) {
    const res = await fetch(BASE_URL);
    console.log(`Req ${i+1}: ${res.status}`);
    console.log(`  Limit: ${res.headers.get('ratelimit-limit')} / ${res.headers.get('x-ratelimit-limit')}`);
    console.log(`  Remaining: ${res.headers.get('ratelimit-remaining')} / ${res.headers.get('x-ratelimit-remaining')}`);
  }
}

run();
