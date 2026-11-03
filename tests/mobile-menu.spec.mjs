// Realer Browsertest des Mobile-Menues (Chrome, 390x844)
import { chromium } from 'playwright';

const URL = (process.env.BASE_URL || 'http://localhost:8125') + '/index.html';
const out = [];
const log = (n, ok, info='') => { out.push({ test:n, ok, info }); console.log((ok?'PASS':'FAIL')+'  '+n+(info?'  -> '+info:'')); };

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport:{width:390,height:844}, deviceScaleFactor:2 });
const consoleErrors = [];
page.on('console', m => { if (m.type()==='error') consoleErrors.push(m.text()); });
page.on('pageerror', e => consoleErrors.push('pageerror: '+e.message));
const failedReq = [];
page.on('requestfailed', r => failedReq.push(r.url()+' :: '+(r.failure()?.errorText||'')));

await page.goto(URL, { waitUntil:'load' });

const menu = page.locator('#mobile-menu');
const burger = page.locator('#burger');
const overlay = page.locator('#mobile-menu-overlay');

// 1) Ausgangszustand
log('Menue initial geschlossen (nicht sichtbar)', !(await menu.isVisible()));
log('Burger aria-expanded=false', (await burger.getAttribute('aria-expanded'))==='false');
let reachable = 0;
for (const l of await page.locator('#mobile-menu a').all()) { if (await l.isVisible()) reachable++; }
log('Geschlossenes Menue nicht per Tastatur erreichbar', reachable===0, 'sichtbare Links: '+reachable);

// 2) Oeffnen
await burger.click();
await page.waitForTimeout(450);
log('Menue geoeffnet sichtbar', await menu.isVisible());
log('Burger aria-expanded=true', (await burger.getAttribute('aria-expanded'))==='true');
log('Burger aria-label = schliessen', /schließen/i.test(await burger.getAttribute('aria-label')||''));
log('Overlay sichtbar', await overlay.isVisible());
const x = await page.evaluate(() => ({
  s1:getComputedStyle(document.querySelector('#burger span:nth-child(1)')).transform,
  s2:getComputedStyle(document.querySelector('#burger span:nth-child(2)')).opacity,
  top:Math.round(document.getElementById('mobile-menu').getBoundingClientRect().top),
  scroll:getComputedStyle(document.body).overflow,
  focusInMenu:document.getElementById('mobile-menu').contains(document.activeElement)
}));
log('Hamburger wird zum X (Balken rotiert)', x.s1!=='none' && x.s1!=='matrix(1, 0, 0, 1, 0, 0)', x.s1);
log('Mittlerer Balken ausgeblendet', parseFloat(x.s2)===0, 'opacity '+x.s2);
log('Menue im Viewport (top=0)', x.top===0, 'top='+x.top);
log('Body-Scroll gesperrt', x.scroll==='hidden');
log('Fokus liegt im Menue', x.focusInMenu);

// 3) Escape schliesst + Fokus zurueck auf Burger
await page.keyboard.press('Escape');
await page.waitForTimeout(450);
log('Escape schliesst Menue', !(await menu.isVisible()));
log('Fokus zurueck auf Burger', await page.evaluate(()=>document.activeElement===document.getElementById('burger')));

// 4) Erneut oeffnen + Klick auf Navigationspunkt schliesst
await burger.click();
await page.waitForTimeout(400);
log('Menue erneut geoeffnet', await menu.isVisible());
await page.locator('#mobile-menu a[href="#einsatzgebiet"]').click();
await page.waitForTimeout(500);
log('Klick auf Menuepunkt schliesst Menue', !(await menu.isVisible()));
log('Body-Scroll wieder frei', (await page.evaluate(()=>getComputedStyle(document.body).overflow))!=='hidden');

// 5) Overlay-Klick schliesst
await burger.click();
await page.waitForTimeout(400);
await page.mouse.click(195, 780); // Bereich unterhalb des Top-Sheets -> Overlay
await page.waitForTimeout(450);
log('Overlay-Klick schliesst Menue', !(await menu.isVisible()));

// 6) Telefon
const tel = await page.locator('#mobile-menu a.menu-phone').getAttribute('href');
log('Telefonlink im Menue korrekt', tel==='tel:+4917621870744', tel||'fehlt');
const bar = await page.locator('.actionbar a[href^="tel:"]').count();
log('Anrufen in mobiler Aktionsleiste', bar===1);

// 7) Kein horizontaler Overflow
const ov = await page.evaluate(()=>{ window.scrollTo(9999,0); const x=window.scrollX; window.scrollTo(0,0);
  return {doc:document.documentElement.scrollWidth, win:window.innerWidth, maxScrollX:x}; });
log('Kein horizontales Scrollen moeglich', ov.maxScrollX===0, 'maxScrollX='+ov.maxScrollX);
log('Kein geklippter Ueberhang', ov.doc<=ov.win+1, ov.doc+' <= '+ov.win);

// 8) Konsole/Netzwerk
log('Keine Konsolenfehler', consoleErrors.length===0, consoleErrors.join(' | ')||'-');
log('Keine fehlgeschlagenen Requests', failedReq.length===0, failedReq.join(' | ')||'-');

await page.screenshot({ path:'tests/shot-mobile-closed.png' });
await burger.click(); await page.waitForTimeout(500);
await page.screenshot({ path:'tests/shot-mobile-open.png' });

await browser.close();
const failed = out.filter(o=>!o.ok);
console.log('\n== '+(out.length-failed.length)+'/'+out.length+' bestanden ==');
process.exit(failed.length?1:0);
