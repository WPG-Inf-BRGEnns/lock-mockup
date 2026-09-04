# AGENTS.md

## Was ist das?

`lock-mockup` ist die Web-Oberflaeche eines **absichtlich unsicheren** IoT-
Tuerschlosses fuer das **Cyber Security Lab** (Tag 1: „Escape the Cyber Security
Lab"). Es simuliert ein billiges IoT-Geraet mit Standard-Zugangsdaten, das die
Teilnehmer:innen im Labornetz finden, per Default-Passwort entsperren und so die
„Tuer" oeffnen. Die Schwachstellen (Default-Credentials, kein TLS, kein Rate-
Limiting) sind **gewollt** und Teil der Uebung.

## Stack

Node.js 24, ESM, Fastify. Keine Datenbank (Zustand im Speicher).

## Befehle

- `npm install` — Abhaengigkeiten
- `npm test` — Tests (`node --test`)
- `npm run lint` — ESLint
- `npm start` — Server starten (laedt `.env`, falls vorhanden)

## Hinweis fuer Agenten / Reviewer

Beziehe dich ausschliesslich auf Dateien **in diesem Repository**. Lies keine
unbeteiligten Dateien ausserhalb des Repos. Commit-Aussagen sind innerhalb des
Repos verifizierbar zu halten.
