const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const dir = process.env.EVIDENCE_DIR || '/tmp/storagecloud-liquid';
fs.mkdirSync(dir, {recursive:true});
(async () => {
 const browser = await chromium.launch({args:['--no-sandbox']});
 try { for (const mobile of [false,true]) {
  const name = mobile ? 'mobile' : 'desktop';
  const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,recordVideo:{dir,size:mobile?{width:390,height:844}:{width:1440,height:900}}});
  const page = await context.newPage(); const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400 && r.url().includes('/_app/'))errors.push(r.url());});
  await page.goto(process.argv[2],{waitUntil:'networkidle'}); await page.waitForTimeout(1200);
  await page.evaluate(()=>window.originalDrop=document.querySelector('.droplet'));
  const sample=()=>page.evaluate(()=>{
   const e=document.querySelector('.droplet'),r=e.getBoundingClientRect(),c=getComputedStyle(e),h=document.querySelector('.specular-primary');
   const hit=(x,y)=>e.contains(document.elementFromPoint(x,y));
   const copyRects=[...document.querySelectorAll('.dock-copy p,.dock-copy h2,.status-head span')].flatMap(el=>{const range=document.createRange();range.selectNodeContents(el);return [...range.getClientRects()];});
   const copyClearance=Math.min(...copyRects.map(t=>Math.hypot(Math.max(t.left-r.x-r.width/2,0,r.x+r.width/2-t.right),Math.max(t.top-r.y-r.height/2,0,r.y+r.height/2-t.bottom))-r.width/2));
   return {copyClearance,scroll:scrollY,x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,hit:[[-.25,0],[.25,0],[0,-.25],[0,.25]].every(([x,y])=>hit(r.x+r.width*(.5+x),r.y+r.height*(.5+y))),same:e===window.originalDrop, radius:c.borderRadius, highlight:getComputedStyle(h).translate, material:c.backgroundImage,plus:+getComputedStyle(document.querySelector('.plus')).opacity,gloss:+getComputedStyle(h).opacity};
  });
  const idle=await sample(); await page.screenshot({path:`${dir}/${name}-idle.png`});
  await page.mouse.move(idle.x+65,idle.y-40); await page.waitForTimeout(450); const pulled=await sample();
  assert.notEqual(pulled.radius,idle.radius,'pointer must deform the actual outer water silhouette');
  assert.notEqual(pulled.highlight,idle.highlight,'pointer must shift reflected light, not only float');
  await page.mouse.move(0,0); await page.waitForTimeout(700);
  if(mobile){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:170,y:720}]});for(let y=690;y>170;y-=30){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:170,y}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else await page.mouse.wheel(0,700);
  await page.waitForTimeout(1200); assert((await sample()).scroll>350,'native gesture advances');
  const max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight),states=[];
  for(const direction of [1,-1])for(let i=0;i<=32;i++){
   const y=max*(direction===1?i/32:1-i/32);await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(65);const s=await sample();states.push(s);
   assert(s.same&&s.visible&&s.hit,`unclipped same reachable droplet at ${name} scroll ${s.scroll}: ${JSON.stringify(s)}`);
   if(mobile)assert(s.copyClearance>=20,`water/glow must clear mobile text: ${JSON.stringify(s)}`);
   assert(s.gloss>.3,'gloss must survive docking');assert.equal(s.material,idle.material,'no matte replacement');
   if(direction===1&&[12,20,26,32].includes(i))await page.screenshot({path:`${dir}/${name}-scroll-${i}.png`});
  }
  await page.evaluate(y=>scrollTo(0,y),max);await page.waitForTimeout(300);
  const dock=await page.locator('.status-orbit').boundingBox(),end=await sample();assert(end.plus>.98);assert(Math.abs(end.x-dock.x-dock.width/2)<3&&Math.abs(end.y-dock.y-dock.height/2)<3,'same droplet lands in status orbit');
  assert.equal(await page.locator('.mini-drop').count(),0,'no second matte droplet');
  const chooser=page.waitForEvent('filechooser');await page.locator('.droplet').click();await chooser;
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);const reduced=await sample();await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);const reduced2=await sample();assert.equal(reduced.x,reduced2.x);assert.equal(reduced.y,reduced2.y);assert.equal(reduced.radius,reduced2.radius);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(500);assert((await sample()).plus<.01,JSON.stringify(await sample()));assert.deepEqual(errors,[]);
  fs.writeFileSync(`${dir}/${name}-states.json`,JSON.stringify({idle,pulled,states,end,errors},null,2));
  const video=page.video();await context.close();await video.saveAs(`${dir}/${name}.webm`);console.log(`${name}: 66 full-range forward/reverse samples, material, native gesture, dock, picker, reduced motion PASS`);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
