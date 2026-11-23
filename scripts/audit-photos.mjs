import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('../data/source-v3.json',import.meta.url),'utf8'));
const manifest=JSON.parse(fs.readFileSync(new URL('../data/photo-manifest.json',import.meta.url),'utf8'));
const checks=manifest.filter(x=>x.source);const results=[];
for(const item of checks){const source=data[item.type==='destination'?'destinations':'events'].find(x=>x.slug===item.slug);const image=source?.image_url||'';let code='UNAVAILABLE';try{const res=await fetch(image,{method:'GET',headers:{Range:'bytes=0-0'},signal:AbortSignal.timeout(8000)});code=res.status+' '+(res.headers.get('content-type')||'');if(res.body){await res.body.cancel()}}catch(e){code=String(e.message||e)}results.push({...item,url:image,result:code});console.log(item.slug,code)}
fs.writeFileSync(new URL('../data/photo-url-test-results.json',import.meta.url),JSON.stringify({date:new Date().toISOString(),results},null,2));
console.log('Done. URL checks test delivery only. They DO NOT prove the subject is correct or the license permits reuse. See source pages and PHOTO-ACCURACY.md.');
