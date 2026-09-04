import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';

// Konfiguration mit leerem Env => reine Defaults (admin/admin, hint an).
const baseConfig = (overrides = {}) => ({ ...loadConfig({}), ...overrides });

// Loggt sich ein und gibt den (signierten) Cookie-Wert fuer Folge-Requests zurueck.
async function login(app, { username = 'admin', password = 'admin' } = {}) {
  const res = await app.inject({
    method: 'POST',
    url: '/login',
    payload: { username, password },
  });
  const cookie = res.cookies.find((c) => c.name === 'lock_session');
  return { res, cookie };
}

test('GET / ohne Anmeldung leitet zur Login-Seite', async () => {
  const app = await buildApp(baseConfig());
  const res = await app.inject({ method: 'GET', url: '/' });
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/login');
  await app.close();
});

test('GET /login zeigt Geraetenamen und (Default) den View-Source-Hinweis', async () => {
  const app = await buildApp(baseConfig());
  const res = await app.inject({ method: 'GET', url: '/login' });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /SmartLock-IoT/);
  assert.match(res.body, /admin\/admin/); // Hinweis im HTML-Kommentar
  await app.close();
});

test('LOCK_HINT=false entfernt den Hinweis aus dem Quelltext', async () => {
  const app = await buildApp(baseConfig({ hint: false }));
  const res = await app.inject({ method: 'GET', url: '/login' });
  assert.doesNotMatch(res.body, /admin\/admin/);
  await app.close();
});

test('POST /login mit falschen Daten: 401, kein Cookie, Fehlermeldung', async () => {
  const app = await buildApp(baseConfig());
  const { res, cookie } = await login(app, { password: 'falsch' });
  assert.equal(res.statusCode, 401);
  assert.equal(cookie, undefined);
  assert.match(res.body, /Falsche Zugangsdaten/);
  await app.close();
});

test('POST /login mit Standard-Passwort: Cookie gesetzt, Redirect', async () => {
  const app = await buildApp(baseConfig());
  const { res, cookie } = await login(app);
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/');
  assert.ok(cookie && cookie.value, 'Session-Cookie erwartet');
  await app.close();
});

test('Angemeldet zeigt / das Dashboard mit Status GESPERRT', async () => {
  const app = await buildApp(baseConfig());
  const { cookie } = await login(app);
  const res = await app.inject({
    method: 'GET',
    url: '/',
    cookies: { lock_session: cookie.value },
  });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /GESPERRT/);
  assert.match(res.body, /Tür entriegeln/);
  await app.close();
});

test('POST /unlock ohne Anmeldung leitet zur Login-Seite', async () => {
  const app = await buildApp(baseConfig());
  const res = await app.inject({ method: 'POST', url: '/unlock' });
  assert.equal(res.statusCode, 302);
  assert.equal(res.headers.location, '/login');
  await app.close();
});

test('POST /unlock angemeldet: entriegelt und zeigt die Escape-Meldung', async () => {
  const app = await buildApp(baseConfig());
  const { cookie } = await login(app);
  const res = await app.inject({
    method: 'POST',
    url: '/unlock',
    cookies: { lock_session: cookie.value },
  });
  assert.equal(res.statusCode, 200);
  assert.match(res.body, /ENTRIEGELT/);
  assert.match(res.body, /entkommen/);
  assert.equal(app.lock.locked, false);
  await app.close();
});

test('GET /api/status liefert die Geraete-JSON', async () => {
  const app = await buildApp(baseConfig());
  const res = await app.inject({ method: 'GET', url: '/api/status' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), {
    device: 'SmartLock-IoT',
    firmware: '1.2.0',
    locked: true,
  });
  await app.close();
});

test('Server-Header gibt sich als Geraet aus (fuer nmap -sV)', async () => {
  const app = await buildApp(baseConfig());
  const res = await app.inject({ method: 'GET', url: '/login' });
  assert.equal(res.headers.server, 'SmartLock-IoT/1.2.0');
  await app.close();
});

test('Unlock-Hook: der Webhook wird beim Entriegeln aufgerufen', async () => {
  // Kleiner Empfaenger, der genau einen POST einsammelt.
  const received = [];
  const hook = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      received.push({ method: req.method, body });
      res.statusCode = 204;
      res.end();
    });
  });
  hook.listen(0);
  await once(hook, 'listening');
  const { port } = hook.address();

  const app = await buildApp(baseConfig({ unlockHookUrl: `http://127.0.0.1:${port}/` }));
  const { cookie } = await login(app);
  await app.inject({
    method: 'POST',
    url: '/unlock',
    cookies: { lock_session: cookie.value },
  });

  assert.equal(received.length, 1);
  assert.equal(received[0].method, 'POST');
  assert.match(received[0].body, /"event":"unlock"/);

  await app.close();
  hook.close();
  await once(hook, 'close');
});
