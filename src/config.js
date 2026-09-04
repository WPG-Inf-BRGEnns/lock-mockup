// Konfiguration des Lock-Mockups. Alle Werte kommen aus Umgebungsvariablen und
// haben bewusst schwache Defaults (admin/admin) — genau das ist die Lektion:
// "Wer aendert schon das Standardpasswort auf einem IoT-Geraet?"

const truthy = (value, fallback) =>
  value === undefined ? fallback : /^(1|true|yes|on)$/i.test(value);

/**
 * Liest die Konfiguration aus einem Env-Objekt (Default: process.env).
 * Als reine Funktion mit injizierbarem `env` ist sie leicht testbar.
 */
export function loadConfig(env = process.env) {
  return {
    host: env.LOCK_HOST ?? '0.0.0.0',
    port: Number(env.LOCK_PORT ?? 8080),
    user: env.LOCK_USER ?? 'admin',
    password: env.LOCK_PASSWORD ?? 'admin',
    // Signatur-Secret fuer das Session-Cookie. Der Default ist absichtlich als
    // solcher erkennbar, damit server.js davor warnen kann.
    sessionSecret: env.LOCK_SESSION_SECRET ?? 'change-me-insecure-lab-secret',
    deviceName: env.LOCK_DEVICE_NAME ?? 'SmartLock-IoT',
    firmware: env.LOCK_FIRMWARE ?? '1.2.0',
    // Bei true steht ein Hinweis auf die Standard-Zugangsdaten als
    // HTML-Kommentar im Quelltext der Login-Seite (belohnt "View Source").
    hint: truthy(env.LOCK_HINT, true),
    // Optionaler Unlock-Hook: Webhook-URL und/oder Shell-Kommando. Beide sind
    // standardmaessig leer (rein visuelles Mockup). Gesetzt koennen sie ein
    // echtes Relais / einen Tueroeffner ansteuern.
    unlockHookUrl: env.UNLOCK_HOOK_URL ?? '',
    unlockHookCmd: env.UNLOCK_HOOK_CMD ?? '',
    // Startzustand des Schlosses. Standard: gesperrt.
    startLocked: (env.LOCK_START_STATE ?? 'locked').toLowerCase() !== 'unlocked',
  };
}
