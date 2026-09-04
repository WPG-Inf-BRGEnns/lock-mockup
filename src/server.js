import { loadConfig } from './config.js';
import { buildApp } from './app.js';

const config = loadConfig();
const app = await buildApp(config, { logger: true });

if (config.sessionSecret.startsWith('change-me')) {
  app.log.warn('LOCK_SESSION_SECRET ist der unsichere Default — im Lab-Betrieb setzen.');
}

try {
  await app.listen({ host: config.host, port: config.port });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
