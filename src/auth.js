import { randomBytes } from 'node:crypto';

// Name des Session-Cookies. Der Wert ist eine zufaellige Session-ID, die per
// @fastify/cookie signiert im Cookie liegt und zusaetzlich serverseitig in
// einem Set gefuehrt wird — so laesst sich eine Session gezielt invalidieren.
export const COOKIE_NAME = 'lock_session';

export function createSessions() {
  const active = new Set();
  return {
    create() {
      const id = randomBytes(16).toString('hex');
      active.add(id);
      return id;
    },
    has(id) {
      return active.has(id);
    },
    destroy(id) {
      active.delete(id);
    },
    clear() {
      active.clear();
    },
  };
}
