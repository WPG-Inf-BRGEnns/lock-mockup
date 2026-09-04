# lock-mockup — Web-Interface des „Lock“ (Cyber Security Lab)

Die Web-Oberfläche eines **absichtlich unsicheren** IoT-Türschlosses für den
Kurs [cyber-security-lab](https://github.com/cmiicbrg/cyber-security-lab),
**Tag 1: „Escape the Cyber Security Lab“**.

Am Ende von Tag 1 lesen die Teilnehmer:innen das „IoTNet“-WLAN-Passwort aus einem
ESP32 aus, finden im Netz ein Gerät, das sich als **„Lock“** ausgibt und auf einem
**nicht standardmäßigen Port** per HTTP antwortet. Der Browser zeigt eine
**Login-Seite** – Zugangsdaten gibt es keine. Aber: *Wer ändert schon das
Standardpasswort auf einem IoT-Gerät?* Mit `admin` / `admin` gelingt die Anmeldung,
auf der Seite lässt sich die **Tür entriegeln** – und das Team entkommt.

Diese App ist genau dieses Gerät.

## ⚠️ Absichtlich unsicher – nur fürs Labor

Standard-Zugangsdaten, kein TLS, kein Rate-Limiting, Sessions nur im Speicher: das
ist **gewollt** und Teil der Lektion (Thema *Broken Authentication* / Default-
Credentials). Das Gerät gehört ausschließlich ins **isolierte Labornetz** und darf
nicht ans Internet oder ins Schulnetz. Es gelten die Regeln aus dem Projektvertrag
des Kurses.

## Voraussetzungen

- Node.js **24** (siehe `.nvmrc`)

## Installation & Start

```bash
npm install
cp .env.example .env      # Defaults funktionieren out of the box
npm start                 # lauscht auf 0.0.0.0:8080
```

Dann im Browser `http://<host>:8080` öffnen. Anmeldung mit `admin` / `admin`,
dann **Tür entriegeln**. `npm run dev` startet mit Auto-Reload.

## Konfiguration

Alle Werte kommen aus Umgebungsvariablen (siehe `.env.example`).

| Variable | Default | Zweck |
| --- | --- | --- |
| `LOCK_PORT` | `8080` | Nicht-Standard-HTTP-Port (nicht 80/443) |
| `LOCK_HOST` | `0.0.0.0` | Im IoTNet erreichbar |
| `LOCK_USER` | `admin` | Standard-Benutzer |
| `LOCK_PASSWORD` | `admin` | Standard-Passwort |
| `LOCK_SESSION_SECRET` | `change-me-…` | Signatur des Session-Cookies (setzen!) |
| `LOCK_DEVICE_NAME` | `SmartLock-IoT` | Branding / `Server`-Header / Titel |
| `LOCK_FIRMWARE` | `1.2.0` | Firmware-Version (Flair) |
| `LOCK_HINT` | `true` | Hinweis auf Default-Zugangsdaten im HTML-Quelltext |
| `LOCK_START_STATE` | `locked` | Startzustand (`locked`/`unlocked`) |
| `UNLOCK_HOOK_URL` | – | Optionaler Webhook (POST) beim Entriegeln |
| `UNLOCK_HOOK_CMD` | – | Optionales Shell-Kommando beim Entriegeln |

## Auffindbarkeit im Netz („gibt sich als Lock aus“)

Damit die Recon-Phase (Tag 1, Nmap) funktioniert, macht sich das Gerät erkennbar:

- Der HTTP-`Server`-Header lautet `SmartLock-IoT/1.2.0` – genau das zeigt
  `nmap -sV`.
- Der Seitentitel und `GET /api/status` (JSON) nennen den Gerätenamen.

```bash
nmap -sV -p 8080 <host>
curl -sI http://<host>:8080/login | grep -i server
curl -s  http://<host>:8080/api/status
```

Für einen Hostnamen `lock.local` empfiehlt sich mDNS über **Avahi** auf dem
Host (`avahi-publish -a` / ein `.service`-File) – das bleibt bewusst außerhalb
dieser App.

## Eine echte Tür öffnen (Unlock-Hook)

Beim Entriegeln feuert die App – falls konfiguriert – einen Webhook und/oder ein
Shell-Kommando. So steuert dieselbe App ohne Codeänderung ein reales Relais /
Maglock an:

```bash
# Webhook an ein Relais / einen ESP32
UNLOCK_HOOK_URL=http://relay.local/unlock npm start

# GPIO auf einem Raspberry Pi (Relais an GPIO 17)
UNLOCK_HOOK_CMD="gpioset gpiochip0 17=1" npm start
```

`UNLOCK_HOOK_CMD` führt ein Shell-Kommando aus – **nur von der Lehrperson**
setzen.

## Reset zwischen Gruppen

Nach dem Entriegeln sperrt der Button **„Wieder sperren“** das Gerät erneut
(oder den Prozess neu starten). Der Zustand liegt nur im Speicher.

## Betrieb im Container

```bash
docker compose up --build     # http://<host>:8080
```

## Tests & Lint

```bash
npm test        # node --test (inkl. Unlock-Hook-Test)
npm run lint    # eslint
```

## Lizenz

MIT — siehe [LICENSE](LICENSE).
