import { chromium } from 'playwright';
import fs from 'node:fs';
const BASE='http://127.0.0.1:65311';
const ROOT='C:/Users/Tolun/Ruso';
const fontCss = fs.readFileSync(ROOT+'/assets/css/fonts.css','utf8').replace(/url\(\.\.\/fonts\//g, `url(${BASE}/assets/fonts/`);
const PAGES={start:['RUESO-Start.dc.html','index.html'],fassaden:['RUESO-Fassaden.dc.html','fassaden.html'],fenster:['RUESO-Fenster.dc.html','fenster.html'],objekttueren:['RUESO-Objekttueren.dc.html','objekttueren.html'],brandschutz:['RUESO-Brandschutz.dc.html','brandschutz.html'],schiebetueren:['RUESO-Schiebetueren.dc.html','schiebetueren.html'],schiebewaende:['RUESO-Schiebewaende.dc.html','schiebewaende.html'],referenzen:['RUESO-Referenzen.dc.html','referenzen.html'],unternehmen:['RUESO-Unternehmen.dc.html','unternehmen.html'],karriere:['RUESO-Karriere.dc.html','karriere.html'],kontakt:['RUESO-Kontakt.dc.html','kontakt.html']};
const lang=process.argv[2]||'en';

const EXTRACT = () => {
  const out=[];
  const walk=(el)=>{
    const st=getComputedStyle(el);
    if(st.display==='none'||st.visibility==='hidden') return;
    if(el.hasAttribute&&el.hasAttribute('hidden')) return;
    for(const n of el.childNodes){
      if(n.nodeType===3){const t=n.textContent.replace(/\s+/g,' ').trim(); if(t) out.push(t);}
      else if(n.nodeType===1){
        if(n.tagName==='SCRIPT'||n.tagName==='STYLE') continue;
        if(n.tagName==='IMG'&&n.alt) out.push('[alt] '+n.alt.replace(/\s+/g,' ').trim());
        if(n.tagName==='INPUT'||n.tagName==='TEXTAREA'){const p=n.getAttribute('placeholder');if(p)out.push('[ph] '+p);}
        walk(n);
      }
    }
  };
  walk(document.body);
  return out;
};

async function get(browser,url,lang){
  const ctx=await browser.newContext({viewport:{width:1440,height:900}});
  await ctx.route('**/*.mp4',r=>r.abort());
  await ctx.route('https://www.rueso.de/**',r=>r.abort());
  await ctx.route('https://d8j0ntlcm91z4**',r=>r.abort());
  await ctx.route('https://fonts.googleapis.com/**',r=>r.fulfill({status:200,contentType:'text/css',body:fontCss}));
  await ctx.addInitScript(l=>{try{localStorage.setItem('rueso_lang',l)}catch(e){}},lang);
  const p=await ctx.newPage();
  await p.goto(url,{waitUntil:'load',timeout:60000});
  await p.waitForTimeout(2500);
  const t=await p.evaluate(EXTRACT);
  await ctx.close();
  return t;
}

const b=await chromium.launch();
for(const [key,[dc,built]] of Object.entries(PAGES)){
  const A=await get(b,`${BASE}/_design/${dc}`,lang);
  const B=await get(b,`${BASE}/${lang==='en'?'en/':''}${built}`,lang);
  const sa=A.join('\n'), sb=B.join('\n');
  if(sa===sb){console.log('ok  ',key,lang,A.length,'Textknoten');continue;}
  console.log('ABW ',key,lang,`orig ${A.length} / build ${B.length}`);
  // diff
  const setA=new Set(A),setB=new Set(B);
  const onlyA=A.filter(x=>!setB.has(x)), onlyB=B.filter(x=>!setA.has(x));
  onlyA.slice(0,15).forEach(x=>console.log('   nur Original: '+JSON.stringify(x.slice(0,160))));
  onlyB.slice(0,15).forEach(x=>console.log('   nur Nachbau : '+JSON.stringify(x.slice(0,160))));
  if(!onlyA.length&&!onlyB.length){
    let i=0;while(i<A.length&&i<B.length&&A[i]===B[i])i++;
    console.log('   Reihenfolge weicht ab ab Index',i,JSON.stringify(A[i]||''),'vs',JSON.stringify(B[i]||''));
  }
}
await b.close();
