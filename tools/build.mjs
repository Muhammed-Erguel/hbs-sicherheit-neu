// Production-Build: erzeugt den auslieferbaren Website-Ordner unter dist/
//
// - Partials:  {{> nav}} / {{> footer}}  ->  src/partials/<name>.html
// - Tokens:    {{NAME}}, {{TEL}}, ...    ->  data/company.json (Single Source of Truth)
// - {{ROOT}}   ist auf der Startseite leer und auf Unterseiten "index.html",
//   damit Sprungmarken wie {{ROOT}}#kontakt von ueberall funktionieren.
//
// Bewusst NICHT nach dist/ kopiert werden die Bild-/Video-Master unter
// assets/img/generated/ und assets/img/logo/ — das sind reine Quelldateien
// fuer tools/optimize.mjs und gehoeren nicht auf den Webserver.
import { readFile, writeFile, readdir, rm, mkdir, cp, access } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'src';
const OUT = 'dist';
const ASSET_EXCLUDE = [
  path.join('assets', 'img', 'generated'),
  path.join('assets', 'img', 'logo'),
];

const c = JSON.parse(await readFile('data/company.json', 'utf8'));

const base = {
  NAME: c.name,                       // Marke (Header/Footer)
  NAME_LEGAL: c.nameLegal,            // offizielle Firmierung (Rechtstexte)
  NAME_KURZ: c.nameKurz,
  EMAIL: c.email,
  TEL: c.telefon.wert,                // CTA-Nummer
  TEL_HREF: c.telefon.href,
  TEL_LEGAL: c.telefonLegal.wert,     // offizielle Nummer (Impressum/Datenschutz)
  TEL_LEGAL_HREF: c.telefonLegal.href,
  STREET: c.adresse.strasse,
  ZIP: c.adresse.plz,
  CITY: c.adresse.ort,
  ZIP_CITY: `${c.adresse.plz} ${c.adresse.ort}`,
  OWNER: c.inhaber,
  LEGAL_FORM: c.rechtsform,
  VAT_ID: c.ustId,
  AUTHORITY_NAME: c.aufsichtsbehoerde.name,
  AUTHORITY_DEPT: c.aufsichtsbehoerde.abteilung,
  AUTHORITY_STREET: c.aufsichtsbehoerde.strasse,
  AUTHORITY_CITY: c.aufsichtsbehoerde.ort,
  GEWO_1: c.erlaubnis34a.absatz1,
  GEWO_2: c.erlaubnis34a.absatz2,
  GEWO_3: c.erlaubnis34a.absatz3,
  DOMAIN: c.domain.replace(/\/$/, ''),
  AI_NOTE: c.aiHinweis,
  YEAR: String(new Date().getFullYear()),
  UPDATED: new Date().toISOString().slice(0, 10),
};

// Partials laden
const partials = {};
for (const f of await readdir(path.join(SRC, 'partials'))) {
  if (f.endsWith('.html')) {
    partials[path.basename(f, '.html')] = await readFile(path.join(SRC, 'partials', f), 'utf8');
  }
}

// dist/ frisch aufbauen
await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const passthru = ['site.webmanifest', 'robots.txt', 'sitemap.xml'];
const files = (await readdir(SRC)).filter((f) => f.endsWith('.html') || passthru.includes(f));

for (const f of files) {
  const isHome = f === 'index.html';
  const tokens = { ...base, ROOT: isHome ? '' : 'index.html', ROOT_HREF: 'index.html' };

  let out = await readFile(path.join(SRC, f), 'utf8');

  // 1) Partials einsetzen
  out = out.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (m, name) => {
    if (!(name in partials)) throw new Error(`Unbekanntes Partial {{> ${name}}} in ${f}`);
    return partials[name].trimEnd();
  });

  // 2) Tokens ersetzen
  out = out.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (!(key in tokens)) throw new Error(`Unbekanntes Token {{${key}}} in ${f}`);
    return tokens[key] ?? '';
  });

  // 3) Aktiven Navigationspunkt markieren
  if (!isHome) out = out.replace(new RegExp(`(<a href="${f}")`, 'g'), '$1 aria-current="page"');

  await writeFile(path.join(OUT, f), out);
  console.log('gerendert', f);
}

// Assets uebernehmen (ohne Master-Ordner)
await cp('assets', path.join(OUT, 'assets'), {
  recursive: true,
  filter: (src) => {
    const rel = path.relative(process.cwd(), src);
    if (ASSET_EXCLUDE.some((ex) => rel === ex || rel.startsWith(ex + path.sep))) return false;
    return !path.basename(src).startsWith('hero-frame-'); // Beweis-Frames aus der Videopruefung
  },
});
console.log('kopiert  assets/');

// Apache-Konfiguration mitnehmen, falls vorhanden
try {
  await access('.htaccess');
  await cp('.htaccess', path.join(OUT, '.htaccess'));
  console.log('kopiert  .htaccess');
} catch { /* optional */ }

console.log(`\nBuild fertig -> ${OUT}/   (Telefon: ${base.TEL})`);
