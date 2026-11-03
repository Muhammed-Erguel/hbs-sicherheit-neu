# Vali Bali hier

# HBS Hegau-Bodensee Sicherheit — Website

Statische Website mit Node-Build. Kein Framework, keine externen Laufzeit-Abhängigkeiten,
keine Cookies und keine Drittanbieter-Dienste.

## Schnellstart

```bash
npm ci          # Abhängigkeiten aus dem Lockfile
npm run build   # erzeugt den auslieferbaren Ordner dist/
npm run serve   # dist/ lokal auf http://localhost:8125
```

## Projektstruktur

| Pfad | Zweck |
|---|---|
| `src/*.html` | Seiten-Templates mit `{{TOKEN}}`-Platzhaltern |
| `src/partials/` | Gemeinsame Bausteine (`{{> nav}}`, `{{> footer}}`) |
| `data/company.json` | **Single Source of Truth** für alle Firmendaten |
| `assets/` | CSS, JS, Bilder, Video (ausgeliefert) |
| `assets/img/generated/` | Bild-/Video-Master — nur Input für `npm run optimize`, **nicht** im Repo |
| `tools/build.mjs` | Build: Templates + Daten → `dist/` |
| `tools/optimize.mjs` | Erzeugt AVIF/WebP/JPG in mehreren Größen aus den Mastern |
| `tests/*.spec.mjs` | Playwright-Tests (Desktop, Mobil, Links, Overflow, Konsole) |
| `dist/` | Build-Output, wird bei jedem Build neu erzeugt (nicht im Repo) |

### Wichtig: Inhalte niemals doppelt pflegen

Firmendaten stehen ausschließlich in `data/company.json`. Der Build setzt sie in alle
Seiten ein. Zwei Rufnummern sind **beabsichtigt** unterschiedlich:

- `telefon` → Header, Menü, CTA, Footer, Anruf-Button
- `telefonLegal` → ausschließlich Impressum und Datenschutzerklärung

Änderungen immer in `src/` bzw. `data/` vornehmen — **nie** direkt in `dist/`.

## Tests

```bash
npm run build
npm run serve          # in einem zweiten Terminal
npm run test:e2e       # Playwright gegen den Production-Build
```

Die Tests prüfen: Mobile-Menü (öffnen/schließen/Fokus/Tastatur), alle internen Links,
kein horizontales Overflow von 320–1440 px, Hero-Video-Wiedergabe, Touch-Targets,
Konsolenfehler und fehlende Ressourcen.

Andere Basis-URL testen: `BASE_URL=http://localhost:3000 npm run test:e2e`

## Deployment

`main` ist der Production-Branch. Jeder Push nach `main` löst das Deployment über
IONOS Deploy Now aus.

```
Änderung → npm run build → npm run test:e2e → commit → push origin main → Deploy Now → hbs-sicherheit.de
```

**Deploy-Now-Einstellungen**

- Build-Befehl: `npm ci && npm run build`
- Output-/Deployment-Ordner: `dist`
- Node: 18 oder neuer

Den GitHub-Actions-Workflow legt Deploy Now bei der Einrichtung selbst an
(`.github/workflows/…`). Er wird hier bewusst **nicht** vorab eingecheckt, damit keine
zweite, konkurrierende Pipeline entsteht.

Für größere Umbauten Feature-Branches nutzen (`feature/xyz`) und erst nach dem Test
nach `main` mergen.

## Offene Punkte

- Porträtfotos für den Team-Bereich (aktuell Platzhalter, Slot 1:1)
- Kurzvorstellung der zweiten Person
- Datenschutz: Hosting-Anbieter, AV-Vertrag, Logfile-Speicherdauer, aktives SSL-Zertifikat
- Die Bild-/Video-Master liegen nur lokal — separat sichern, sonst ist
  `npm run optimize` später nicht mehr reproduzierbar.

Cookie-Banner gibt es bewusst keinen: Die Seite lädt keine Cookies, kein Tracking und
keine Drittanbieter-Ressourcen. Sobald Karten, Analytics oder Embeds dazukommen, muss
das neu bewertet werden.
