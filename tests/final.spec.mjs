import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://localhost:8125';
const out = [];
const log = (n, ok, i = '') => { out.push({ n, ok }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (i ? '  -> ' + i : '')); };
const b = await chromium.launch({ channel: 'chrome' });

/* ================= MOBILE 390x844 ================= */
console.log('\n--- MOBILE 390x844 ---');
const m = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
const errsM = [];
m.on('page', pg => { pg.on('console', c => { if (c.type() === 'error') errsM.push(c.text()); }); pg.on('pageerror', e => errsM.push(e.message)); });
const p = await m.newPage();

await p.goto(BASE + '/index.html', { waitUntil: 'load' });
log('1. Startseite laedt', (await p.title()).includes('HBS'));

const menu = p.locator('#mobile-menu'), burger = p.locator('#burger');
await burger.click(); await p.waitForTimeout(450);
log('2. Mobile-Menue oeffnet', await menu.isVisible());
await burger.click(); await p.waitForTimeout(450);
log('3. Mobile-Menue schliesst ueber X', !(await menu.isVisible()));
await burger.click(); await p.waitForTimeout(450);
log('4. Menue erneut geoeffnet', await menu.isVisible());
await p.locator('#mobile-menu a[href$="#team"]').click(); await p.waitForTimeout(600);
log('5.+6. Menuepunkt klickbar und Menue schliesst', !(await menu.isVisible()));

const tel = await p.locator('.actionbar a[href^="tel:"]').getAttribute('href');
log('7. Telefonnummer per tel: erreichbar', tel === 'tel:+4917621870744', tel);

const scrolled = await p.evaluate(async () => {
  const h = document.body.scrollHeight;
  for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 45)); }
  window.scrollTo(0, h); await new Promise(r => setTimeout(r, 250));
  return { h, y: window.scrollY };
});
log('8. Gesamte Startseite scrollbar', scrolled.y > 0, 'Hoehe ' + scrolled.h + 'px');
log('9. Team-Bereich mit 2 Karten', (await p.locator('#team .team-card').count()) === 2);
log('10. Footer vorhanden', await p.locator('footer .footer-grid').isVisible());

await p.locator('footer a[href="impressum.html"]').click(); await p.waitForLoadState('load');
log('11. Impressum oeffnet', p.url().includes('impressum'), p.url().split('/').pop());
const ls1 = await p.evaluate(async () => { const h = document.body.scrollHeight; window.scrollTo(0, h); await new Promise(r => setTimeout(r, 200)); return { h, y: window.scrollY }; });
log('13a. Impressum scrollbar', ls1.y > 0, 'Hoehe ' + ls1.h + 'px');

await p.goto(BASE + '/datenschutz.html', { waitUntil: 'load' });
log('12. Datenschutz oeffnet', p.url().includes('datenschutz'));
const ls2 = await p.evaluate(async () => { const h = document.body.scrollHeight; window.scrollTo(0, h); await new Promise(r => setTimeout(r, 200)); return { h, y: window.scrollY }; });
log('13b. Datenschutz scrollbar', ls2.y > 0, 'Hoehe ' + ls2.h + 'px');

const consent = await p.evaluate(() => ({ cookie: document.cookie, ls: localStorage.length, ss: sessionStorage.length }));
const cookies = await m.cookies();
log('14a. Keine Cookies gesetzt', cookies.length === 0 && consent.cookie.length === 0, 'ctx=' + cookies.length);
log('14b. Kein Local-/Session-Storage', consent.ls === 0 && consent.ss === 0);
const banner = await p.locator('[class*="cookie" i], [id*="cookie" i], [class*="consent" i], [id*="consent" i]').count();
log('14c. Kein Consent-Banner (kein Fake-Consent)', banner === 0);

await p.goBack({ waitUntil: 'load' });
log('15. Zurueck-Navigation funktioniert', p.url().includes('impressum'), p.url().split('/').pop());

await p.goto(BASE + '/index.html', { waitUntil: 'load' });
const ovf = await p.evaluate(() => {
  window.scrollTo(9999, 0); const sx = window.scrollX; window.scrollTo(0, 0);
  const clipped = [...document.querySelectorAll('main *')]
    .filter(el => el.children.length === 0 && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0)
    .map(el => el.tagName + ': ' + (el.textContent || '').trim().slice(0, 30));
  return { sx, sw: document.documentElement.scrollWidth, iw: window.innerWidth, clipped: clipped.slice(0, 4) };
});
log('16. Kein horizontales Scrollen', ovf.sx === 0 && ovf.sw <= ovf.iw + 1, ovf.sw + '/' + ovf.iw);
log('17. Keine abgeschnittenen Texte', ovf.clipped.length === 0, ovf.clipped.join(' | ') || '-');

await burger.click(); await p.waitForTimeout(450);
const touch = await p.evaluate(() => {
  const small = [];
  const check = (sel) => document.querySelectorAll(sel).forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.height > 0 && r.height < 44) small.push(el.tagName + '.' + String(el.className).split(' ')[0] + ' h=' + Math.round(r.height));
  });
  check('#mobile-menu a'); check('.actionbar a'); check('#burger');
  return small.slice(0, 5);
});
log('18. Touch-Targets mindestens 44px', touch.length === 0, touch.join(' | ') || '-');
log('19. Keine Konsolenfehler (mobil)', errsM.length === 0, errsM.slice(0, 2).join(' | ') || '-');
await p.close(); await m.close();

/* ================= DESKTOP 1440x900 ================= */
console.log('\n--- DESKTOP 1440x900 ---');
const d = await b.newContext({ viewport: { width: 1440, height: 900 } });
const errsD = [];
d.on('page', pg => { pg.on('console', c => { if (c.type() === 'error') errsD.push(c.text()); }); pg.on('pageerror', e => errsD.push(e.message)); });
const dp = await d.newPage();
await dp.goto(BASE + '/index.html', { waitUntil: 'load' });

log('Desktop-Navigation sichtbar', await dp.locator('.nav-links').isVisible());
log('Burger auf Desktop ausgeblendet', !(await dp.locator('#burger').isVisible()));
log('Telefon im Header sichtbar', await dp.locator('.nav-phone').isVisible());
log('Hero-Headline vorhanden', await dp.locator('.hero h1').isVisible());

const t1 = await dp.evaluate(() => { const v = document.querySelector('.hero-video'); return v ? v.currentTime : -1; });
await dp.waitForTimeout(3200);
const vid = await dp.evaluate(() => { const v = document.querySelector('.hero-video'); return { t: v.currentTime, paused: v.paused, ended: v.ended, rs: v.readyState, vw: v.videoWidth }; });
log('Hero-Video laeuft (currentTime steigt)', vid.t > t1 && !vid.paused && !vid.ended && vid.rs >= 3 && vid.vw > 0,
  't ' + t1.toFixed(2) + ' -> ' + vid.t.toFixed(2) + ', readyState ' + vid.rs);

for (const [id, label] of [['leistungen', 'Leistungen'], ['vorteile', 'Vorteile'], ['ablauf', 'Arbeitsweise'], ['team', 'Team'], ['einsatzgebiet', 'Einsatzgebiet'], ['kontakt', 'Kontakt']]) {
  log('Sektion "' + label + '" vorhanden', (await dp.locator('#' + id).count()) === 1);
}
log('Kontakt-CTA mit Telefon', (await dp.locator('#kontakt a[href^="tel:"]').count()) >= 1);

await dp.keyboard.press('Tab');
await dp.waitForTimeout(350);
const skip = await dp.evaluate(() => { const a = document.activeElement; const r = a.getBoundingClientRect(); return { cls: String(a.className), top: Math.round(r.top), h: Math.round(r.height) }; });
log('Skip-Link per Tab erreichbar und sichtbar', skip.cls.includes('skip-link') && skip.top >= 0 && skip.h > 0, skip.cls + ' top=' + skip.top);

const focusRing = await dp.evaluate(() => { const a = document.querySelector('.nav-links a'); a.focus(); return getComputedStyle(a).outlineColor; });
log('Fokuszustand definiert', !!focusRing, focusRing);
log('Keine Konsolenfehler (Desktop)', errsD.length === 0, errsD.slice(0, 2).join(' | ') || '-');

await dp.screenshot({ path: 'tests/final-desktop.png' });
await b.close();

const f = out.filter(o => !o.ok);
console.log('\n===== ' + (out.length - f.length) + '/' + out.length + ' bestanden =====');
if (f.length) console.log('Fehlgeschlagen: ' + f.map(x => x.n).join(', '));
process.exit(f.length ? 1 : 0);
