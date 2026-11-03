// Bild-Optimierung: responsive AVIF/WebP/JPG aus den (gebrandeten) Roh-Bildern.
import sharp from 'sharp';
import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const SRC = 'assets/img/generated';
const OUT = 'assets/img';
await mkdir(OUT, { recursive: true });

const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

const jobs = [
  { src: 'werkschutz-branded-raw.png',    base: 'werkschutz',    widths: [800, 480] },
  { src: 'veranstaltung-branded-raw.png', base: 'veranstaltung', widths: [800, 480] },
  { src: 'baustelle-branded-raw.png',     base: 'baustelle',     widths: [800, 480] },
  // Bestehendes Hegau-Bodensee-Bild — nur technisch optimiert, inhaltlich unveraendert
  { src: 'region-raw.png',                base: 'region',        widths: [1920, 1280, 768] },
];

for (const job of jobs) {
  const inPath = path.join(SRC, job.src);
  if (!(await exists(inPath))) { console.log('skip (fehlt):', job.src); continue; }
  for (const w of job.widths) {
    const pipe = sharp(inPath).resize({ width: w, withoutEnlargement: true });
    await pipe.clone().avif({ quality: 52 }).toFile(path.join(OUT, `${job.base}-${w}.avif`));
    await pipe.clone().webp({ quality: 72 }).toFile(path.join(OUT, `${job.base}-${w}.webp`));
    await pipe.clone().jpeg({ quality: 78, mozjpeg: true }).toFile(path.join(OUT, `${job.base}-${w}.jpg`));
  }
  console.log('ok', job.base, job.widths.join('/'));
}

// Open-Graph-Bild aus dem Hero-Poster (falls vorhanden)
if (await exists(path.join(OUT, 'hero-stadium-poster.jpg'))) {
  await sharp(path.join(OUT, 'hero-stadium-poster.jpg'))
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'attention' })
    .jpeg({ quality: 82, mozjpeg: true }).toFile(path.join(OUT, 'og-image.jpg'));
  console.log('ok og-image 1200x630');
}
