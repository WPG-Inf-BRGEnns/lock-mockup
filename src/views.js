// Server-gerenderte HTML-Seiten des Geraets. Bewusst ohne Template-Engine:
// drei kleine Funktionen liefern vollstaendige HTML-Dokumente.

const escapeMap = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (value) => String(value).replace(/[&<>"']/g, (c) => escapeMap[c]);

// Kleines Schloss-Favicon als data-URI, damit der Browser keinen 404 erzeugt.
const FAVICON =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22%3E%3Ctext y=%2214%22 font-size=%2214%22%3E%F0%9F%94%90%3C/text%3E%3C/svg%3E';

function layout({ title, deviceName, firmware, body }) {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="icon" href="${FAVICON}">
<link rel="stylesheet" href="/assets/style.css">
</head>
<body>
<div class="device">
  <header class="device__head">
    <span class="device__logo" aria-hidden="true">&#128274;</span>
    <div>
      <div class="device__name">${esc(deviceName)}</div>
      <div class="device__fw">Firmware ${esc(firmware)}</div>
    </div>
  </header>
${body}
  <footer class="device__foot">&copy; 2019 ${esc(deviceName)} &middot; Web-Konfiguration</footer>
</div>
</body>
</html>`;
}

export function loginPage(config, { error } = {}) {
  const hint = config.hint
    ? '\n<!-- TODO: Standard-Zugangsdaten (admin/admin) vor Auslieferung aendern! -->'
    : '';
  const body = `  <form class="card" method="post" action="/login" autocomplete="off">
    <h1 class="card__title">Anmeldung</h1>
    ${error ? `<p class="alert" role="alert">${esc(error)}</p>` : ''}
    <label>Benutzername
      <input name="username" required autofocus autocapitalize="none" spellcheck="false">
    </label>
    <label>Passwort
      <input name="password" type="password" required>
    </label>
    <button type="submit">Anmelden</button>
  </form>`;
  return (
    layout({
      title: `${config.deviceName} · Anmeldung`,
      deviceName: config.deviceName,
      firmware: config.firmware,
      body,
    }) + hint
  );
}

export function dashboard(config, { locked, justUnlocked = false } = {}) {
  const badge = locked
    ? '<span class="badge badge--locked">&#128274; GESPERRT</span>'
    : '<span class="badge badge--open">&#128275; ENTRIEGELT</span>';

  const control = locked
    ? `    <form method="post" action="/unlock">
      <button class="btn btn--unlock" type="submit">Tür entriegeln</button>
    </form>`
    : `${justUnlocked ? '    <p class="escape">&#127881; Die Tür ist offen &ndash; du bist aus dem Cyber Security Lab entkommen!</p>\n' : ''}    <form method="post" action="/lock">
      <button class="btn btn--lock" type="submit">Wieder sperren</button>
    </form>`;

  const body = `  <section class="card">
    <h1 class="card__title">Türsteuerung</h1>
    <p class="status">Status: ${badge}</p>
${control}
    <form method="post" action="/logout" class="logout">
      <button class="btn btn--ghost" type="submit">Abmelden</button>
    </form>
  </section>`;

  return layout({
    title: `${config.deviceName} · Steuerung`,
    deviceName: config.deviceName,
    firmware: config.firmware,
    body,
  });
}
