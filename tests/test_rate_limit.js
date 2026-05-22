/**
 * ============================================================
 * Test Automático de Rate Limit y Protección DDoS
 * ============================================================
 * 
 * Este test lee los valores directamente de tu archivo .env
 * y ajusta la cantidad de peticiones automáticamente.
 * 
 * IMPORTANTE: Antes de ejecutar, modifica TEMPORALMENTE tu .env
 * con valores bajos para que el test termine rápido:
 * 
 *   RATE_LIMIT_MAX_PER_HOUR=20
 *   DDOS_MAX_REQUESTS_PER_MINUTE=10
 *   DDOS_BLOCK_DURATION_MINUTES=1
 * 
 * Luego reinicia el servidor y ejecuta:
 *   node tests/test_rate_limit.js
 * 
 * Al terminar, restaura los valores originales en .env.
 * ============================================================
 */

require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}`;
const API_PREFIX = (process.env.API_PREFIX || 'api/v1').replace(/^\//, '');
const ENDPOINT = `${BASE_URL}/${API_PREFIX}/`;

// Leer los valores directamente del .env
const DDOS_MAX = parseInt(process.env.DDOS_MAX_REQUESTS_PER_MINUTE) || 100;
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_PER_HOUR) || 1000;

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

const log = {
  title: () => console.log(`\n${colors.bold}${colors.cyan}${'═'.repeat(60)}${colors.reset}`),
  section: (msg) => console.log(`${colors.bold}${colors.cyan}  ${msg}${colors.reset}`),
  pass: (msg) => console.log(`  ${colors.green}✔ PASS${colors.reset} ${msg}`),
  fail: (msg) => console.log(`  ${colors.red}✘ FAIL${colors.reset} ${msg}`),
  info: (msg) => console.log(`  ${colors.dim}  ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`  ${colors.yellow}  ⚠ ${msg}${colors.reset}`),
  divider: () => console.log(`${colors.cyan}${'─'.repeat(60)}${colors.reset}`),
};

let totalTests = 0;
let passedTests = 0;

function assert(condition, passMsg, failMsg) {
  totalTests++;
  if (condition) {
    passedTests++;
    log.pass(passMsg);
  } else {
    log.fail(failMsg);
  }
}

async function makeRequest() {
  try {
    const res = await fetch(ENDPOINT);
    const body = await res.json();
    return { status: res.status, body };
  } catch (err) {
    return { status: 0, error: err.message };
  }
}

async function makeRequests(count) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(await makeRequest());
  }
  return results;
}

// ============================================================
// TEST 1: Verificar que las peticiones normales funcionan
// ============================================================
async function testNormalRequests() {
  log.title();
  log.section('TEST 1: Peticiones normales (deben responder 200)');
  log.divider();

  const results = await makeRequests(3);

  for (let i = 0; i < results.length; i++) {
    assert(
      results[i].status === 200,
      `Petición ${i + 1} respondió con status 200`,
      `Petición ${i + 1} respondió con status ${results[i].status} (esperado: 200)`
    );
  }
}

// ============================================================
// TEST 2: Detector DDoS — Superar el límite por minuto
// ============================================================
async function testDdosDetection() {
  log.title();
  log.section(`TEST 2: Detección DDoS (superar ${DDOS_MAX} req/min)`);
  log.divider();

  // Necesitamos enviar suficientes peticiones para superar el límite
  // Ya enviamos 3 en el Test 1, así que ajustamos
  const remaining = DDOS_MAX - 3; // Peticiones que faltan para llegar al límite
  const extra = 5;                // Peticiones adicionales que deben ser bloqueadas
  const totalToSend = remaining + extra;

  log.info(`Ya se enviaron 3 en el Test 1. Faltan ${remaining} para el límite.`);
  log.info(`Enviando ${totalToSend} peticiones más (${remaining} normales + ${extra} que deben ser bloqueadas)...`);

  const results = await makeRequests(totalToSend);

  // Las primeras 'remaining' deben ser 200 (completamos el cupo)
  const normalResults = results.slice(0, remaining);
  const normalOk = normalResults.every(r => r.status === 200);
  assert(
    normalOk,
    `Las primeras ${remaining} peticiones respondieron 200 (dentro del límite, total: ${DDOS_MAX})`,
    `Algunas peticiones dentro del límite NO respondieron 200. Statuses: [${normalResults.map(r => r.status).join(', ')}]`
  );

  // La petición que supera el límite debe provocar bloqueo (403)
  const triggerResult = results[remaining];
  assert(
    triggerResult.status === 403,
    `La petición #${DDOS_MAX + 1} (total) fue bloqueada con status 403 (DDoS detectado)`,
    `La petición #${DDOS_MAX + 1} (total) respondió con status ${triggerResult.status} (esperado: 403)`
  );

  if (triggerResult.body?.error?.message) {
    log.info(`Mensaje: "${triggerResult.body.error.message}"`);
  }

  // Las peticiones siguientes también deben ser 403 (IP ya bloqueada)
  const blockedResults = results.slice(remaining + 1);
  const allBlocked = blockedResults.every(r => r.status === 403);
  assert(
    allBlocked,
    `Las ${blockedResults.length} peticiones restantes también fueron bloqueadas (403) — IP en lista negra`,
    `Algunas peticiones después del bloqueo NO devolvieron 403. Statuses: [${blockedResults.map(r => r.status).join(', ')}]`
  );
}

// ============================================================
// TEST 3: IP Bloqueada — Verificar que sigue bloqueada
// ============================================================
async function testIpStillBlocked() {
  log.title();
  log.section('TEST 3: Verificar que la IP sigue bloqueada');
  log.divider();
  log.info('Esperando 3 segundos y enviando nueva petición...');

  await new Promise(resolve => setTimeout(resolve, 3000));

  const result = await makeRequest();

  assert(
    result.status === 403,
    `La IP sigue bloqueada después de 3 segundos (status 403)`,
    `La IP ya NO está bloqueada (status ${result.status}). ¿DDOS_BLOCK_DURATION_MINUTES es muy bajo?`
  );

  if (result.body?.error?.details) {
    log.info(`Detalles: "${result.body.error.details}"`);
  }
}

// ============================================================
// TEST 4: Rate Limit Global — Superar el límite por hora
// ============================================================
async function testGlobalRateLimit() {
  log.title();
  log.section(`TEST 4: Rate Limit Global (superar ${RATE_LIMIT_MAX} req/hora)`);
  log.divider();
  log.warn('NOTA: Este test requiere que tu IP NO esté bloqueada por DDoS.');
  log.warn('Si el test anterior bloqueó tu IP, reinicia el servidor antes');
  log.warn('de ejecutar este test con: node tests/test_rate_limit.js --only-global');
  log.info(`Enviando ${RATE_LIMIT_MAX + 3} peticiones...`);

  const results = await makeRequests(RATE_LIMIT_MAX + 3);

  // Verificar que al menos la última petición sea 429
  const lastResults = results.slice(RATE_LIMIT_MAX);
  const hasRateLimit = lastResults.some(r => r.status === 429);

  assert(
    hasRateLimit,
    `Se recibió status 429 (Too Many Requests) al superar ${RATE_LIMIT_MAX} peticiones`,
    `No se recibió 429 después de ${RATE_LIMIT_MAX} peticiones. Statuses finales: [${lastResults.map(r => r.status).join(', ')}]`
  );

  if (hasRateLimit) {
    const rateLimitedResponse = lastResults.find(r => r.status === 429);
    if (rateLimitedResponse?.body?.error?.message) {
      log.info(`Mensaje: "${rateLimitedResponse.body.error.message}"`);
    }
  }
}

// ============================================================
// Ejecutar todos los tests
// ============================================================
async function runAllTests() {
  console.log(`${colors.bold}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     TEST AUTOMÁTICO — RATE LIMIT & PROTECCIÓN DDoS   ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(colors.reset);

  // Mostrar configuración detectada
  log.info(`Endpoint:                    ${ENDPOINT}`);
  log.info(`DDOS_MAX_REQUESTS_PER_MINUTE: ${DDOS_MAX}`);
  log.info(`RATE_LIMIT_MAX_PER_HOUR:      ${RATE_LIMIT_MAX}`);

  if (DDOS_MAX > 50) {
    console.log();
    log.warn(`¡DDOS_MAX_REQUESTS_PER_MINUTE es ${DDOS_MAX}!`);
    log.warn('El test enviará muchas peticiones y tardará más.');
    log.warn('Para un test rápido, cambia en .env a un valor bajo (ej: 10)');
    log.warn('y reinicia el servidor antes de ejecutar el test.');
    console.log();
  }

  const args = process.argv.slice(2);
  const onlyGlobal = args.includes('--only-global');

  // Verificar que el servidor esté corriendo
  try {
    await fetch(ENDPOINT);
  } catch (err) {
    log.fail(`No se pudo conectar a ${ENDPOINT}`);
    log.warn('Asegúrate de que el servidor esté corriendo: npm start');
    process.exit(1);
  }

  if (onlyGlobal) {
    log.info('Ejecutando solo el test de Rate Limit Global (--only-global)');
    await testGlobalRateLimit();
  } else {
    await testNormalRequests();
    await testDdosDetection();
    await testIpStillBlocked();
  }

  // Resumen
  log.title();
  log.section('RESULTADOS');
  log.divider();
  console.log(`\n  Total:    ${totalTests} tests`);
  console.log(`  ${colors.green}Pasaron:  ${passedTests}${colors.reset}`);
  console.log(`  ${colors.red}Fallaron: ${totalTests - passedTests}${colors.reset}\n`);

  if (passedTests === totalTests) {
    console.log(`  ${colors.bold}${colors.green}🎉 ¡Todos los tests pasaron!${colors.reset}\n`);
  } else {
    console.log(`  ${colors.bold}${colors.red}⚠ Algunos tests fallaron. Revisa los detalles arriba.${colors.reset}\n`);
  }

  log.divider();
  log.warn('Recuerda restaurar los valores originales en .env:');
  log.info('RATE_LIMIT_MAX_PER_HOUR=1000');
  log.info('DDOS_MAX_REQUESTS_PER_MINUTE=100');
  log.info('DDOS_BLOCK_DURATION_MINUTES=60');
  console.log();
}

runAllTests();
