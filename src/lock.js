import { execFile } from 'node:child_process';

/**
 * Der Schlosszustand lebt im Speicher (ein billiges IoT-Geraet fuehrt auch
 * keine Historie). `unlock()` schaltet den Zustand um und feuert den optionalen
 * Unlock-Hook, damit dieselbe App spaeter ein echtes Relais ansteuern kann.
 */
export function createLock(config, log) {
  let locked = config.startLocked;
  return {
    get locked() {
      return locked;
    },
    lock() {
      locked = true;
    },
    async unlock() {
      locked = false;
      await fireHook(config, log);
    },
  };
}

async function fireHook(config, log) {
  if (config.unlockHookUrl) {
    try {
      const res = await fetch(config.unlockHookUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          event: 'unlock',
          device: config.deviceName,
          ts: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(3000),
      });
      log?.info?.({ url: config.unlockHookUrl, status: res.status }, 'unlock webhook gefeuert');
    } catch (err) {
      log?.error?.({ err: String(err), url: config.unlockHookUrl }, 'unlock webhook fehlgeschlagen');
    }
  }

  if (config.unlockHookCmd) {
    // SICHERHEIT: fuehrt ein Shell-Kommando aus. Nur die Lehrperson setzt diese
    // Variable (z. B. `gpioset ...` zum Schalten eines Relais auf einem Pi).
    execFile('/bin/sh', ['-c', config.unlockHookCmd], { timeout: 5000 }, (err, _stdout, stderr) => {
      if (err) log?.error?.({ err: String(err), stderr }, 'unlock-kommando fehlgeschlagen');
      else log?.info?.({ cmd: config.unlockHookCmd }, 'unlock-kommando ausgefuehrt');
    });
  }
}
