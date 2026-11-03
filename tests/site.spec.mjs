import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://localhost:8125';
const PAGES=['/index.html','/impressum.html','/datenschutz.html'];
const out=[]; const log=(n,ok,i='')=>{out.push({ok}); console.log((ok?'PASS':'FAIL')+'  '+n+(i?'  -> '+i:''));};

const b=await chromium.launch({channel:'chrome'});
const ctx=await b.newContext({viewport:{width:1440,height:900}});
const errs=[], failed=[];
ctx.on('page',p=>{ p.on('console',m=>{if(m.type()==='error')errs.push(p.url()+': '+m.text());});
                   p.on('pageerror',e=>errs.push(p.url()+': '+e.message));
                   p.on('requestfailed',r=>failed.push(p.url()+' -> '+r.url())); });
const page=await ctx.newPage();

const seen=new Map();
for (const path of PAGES){
  await page.goto(BASE+path,{waitUntil:'load'});
  const t=await page.title();
  log('Seite laedt: '+path, t.length>0, t.slice(0,60));

  const h1=await page.locator('h1').count();
  log('  genau eine H1', h1===1, 'h1='+h1);

  const canon=await page.locator('link[rel=canonical]').getAttribute('href');
  log('  Canonical gesetzt', !!canon, canon||'-');

  // interne Links einsammeln + pruefen
  const links=await page.evaluate(()=>[...document.querySelectorAll('a[href]')].map(a=>({href:a.getAttribute('href'), abs:a.href, txt:(a.textContent||'').trim().slice(0,25)})));
  const bad=[];
  for (const l of links){
    if (/^(mailto:|tel:)/.test(l.href)) continue;
    if (l.href==='#'||l.href===''){ bad.push('LEERER LINK: "'+l.txt+'"'); continue; }
    if (l.abs.startsWith(BASE)){
      const u=new URL(l.abs);
      if (u.hash && u.pathname===new URL(BASE+path).pathname){
        const ok=await page.locator(u.hash.replace(/^#/,'#')).count();
        if(!ok) bad.push('ANKER FEHLT: '+u.hash);
        continue;
      }
      if (!seen.has(u.pathname)){
        const r=await page.request.get(u.origin+u.pathname);
        seen.set(u.pathname, r.status());
      }
      if (seen.get(u.pathname)>=400) bad.push('HTTP '+seen.get(u.pathname)+': '+u.pathname);
    }
  }
  log('  alle Links gueltig ('+links.length+')', bad.length===0, bad.slice(0,5).join(' | ')||'-');

  // Overflow ueber mehrere Breiten
  for (const w of [320,390,768,1280,1440]){
    await page.setViewportSize({width:w,height:900});
    const r=await page.evaluate(()=>{window.scrollTo(9999,0);const x=window.scrollX;window.scrollTo(0,0);
      return {sx:x, sw:document.documentElement.scrollWidth, iw:window.innerWidth};});
    log('  kein Overflow @'+w, r.sx===0 && r.sw<=r.iw+1, r.sw+'/'+r.iw);
  }
  await page.setViewportSize({width:1440,height:900});
}
log('Keine Konsolenfehler', errs.length===0, errs.slice(0,3).join(' | ')||'-');
log('Keine fehlgeschlagenen Requests', failed.length===0, failed.slice(0,3).join(' | ')||'-');

await b.close();
const f=out.filter(o=>!o.ok).length;
console.log('\n== '+(out.length-f)+'/'+out.length+' bestanden ==');
process.exit(f?1:0);
