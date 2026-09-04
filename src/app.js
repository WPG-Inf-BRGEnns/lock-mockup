import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import formbody from '@fastify/formbody';
import fastifyStatic from '@fastify/static';
import { createSessions, COOKIE_NAME } from './auth.js';
import { createLock } from './lock.js';
import { dashboard, loginPage } from './views.js';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Baut die Fastify-Instanz (ohne zu lauschen), damit Tests sie per
 * `app.inject()` ansprechen koennen. `opts.lock` / `opts.sessions` erlauben das
 * Einschleusen eigener Instanzen im Test.
 */
export async function buildApp(config, opts = {}) {
  const app = Fastify({ logger: opts.logger ?? false });
  const sessions = opts.sessions ?? createSessions();
  const lock = opts.lock ?? createLock(config, app.log);

  await app.register(cookie, { secret: config.sessionSecret });
  await app.register(formbody);
  await app.register(fastifyStatic, {
    root: join(here, '..', 'public'),
    prefix: '/assets/',
    decorateReply: false,
  });

  // Das Geraet "gibt sich als Lock aus": dieser Server-Header taucht bei
  // `nmap -sV` auf und macht den Dienst als Schloss erkennbar.
  app.addHook('onSend', async (_req, reply, payload) => {
    reply.header('Server', `${config.deviceName}/${config.firmware}`);
    return payload;
  });

  const sessionId = (req) => {
    const raw = req.cookies?.[COOKIE_NAME];
    if (!raw) return null;
    const unsigned = req.unsignCookie(raw);
    if (!unsigned.valid || !unsigned.value) return null;
    return sessions.has(unsigned.value) ? unsigned.value : null;
  };

  const requireAuth = async (req, reply) => {
    if (!sessionId(req)) return reply.redirect('/login');
  };

  app.get('/login', async (req, reply) => {
    if (sessionId(req)) return reply.redirect('/');
    return reply.type('text/html').send(loginPage(config));
  });

  app.post('/login', async (req, reply) => {
    const { username, password } = req.body ?? {};
    if (username === config.user && password === config.password) {
      const id = sessions.create();
      reply.setCookie(COOKIE_NAME, id, {
        signed: true,
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      });
      return reply.redirect('/');
    }
    return reply
      .code(401)
      .type('text/html')
      .send(loginPage(config, { error: 'Falsche Zugangsdaten. Bitte erneut versuchen.' }));
  });

  app.post('/logout', async (req, reply) => {
    const id = sessionId(req);
    if (id) sessions.destroy(id);
    reply.clearCookie(COOKIE_NAME, { path: '/' });
    return reply.redirect('/login');
  });

  app.get('/', { preHandler: requireAuth }, async (_req, reply) =>
    reply.type('text/html').send(dashboard(config, { locked: lock.locked })),
  );

  app.post('/unlock', { preHandler: requireAuth }, async (_req, reply) => {
    await lock.unlock();
    return reply.type('text/html').send(dashboard(config, { locked: lock.locked, justUnlocked: true }));
  });

  app.post('/lock', { preHandler: requireAuth }, async (_req, reply) => {
    lock.lock();
    return reply.redirect('/');
  });

  // Kleiner IoT-typischer JSON-Endpunkt: nuetzlich fuer curl/Nmap-Enumeration
  // und fuer ein Relais/den ESP32 zum Abfragen des Zustands.
  app.get('/api/status', async (_req, reply) =>
    reply.send({ device: config.deviceName, firmware: config.firmware, locked: lock.locked }),
  );

  app.decorate('lock', lock);
  app.decorate('sessions', sessions);
  return app;
}
