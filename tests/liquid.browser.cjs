process.env.PLAYWRIGHT_BROWSERS_PATH ||= '/tmp/storagecloud-browser/browsers';
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/tmp/storagecloud-browser/node_modules/playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dir = process.env.EVIDENCE_DIR || '/tmp/storagecloud-liquid';
assert(path.resolve(dir).startsWith('/tmp/'), 'evidence must stay under /tmp');
fs.mkdirSync(dir, {recursive:true});
assert(fs.realpathSync(dir).startsWith('/tmp/'), 'evidence must not resolve outside /tmp');
(async () => {
 const browser = await chromium.launch({args:['--no-sandbox']});
 const failures=[];
 try { for (const mobile of [false,true]) {
  const name = mobile ? 'mobile' : 'desktop';
  const context = await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile,recordVideo:{dir,size:mobile?{width:390,height:844}:{width:1440,height:900}}});
   const page = await context.newPage(); const errors=[],screenshots=[],overlaps=[];
   const screenshot=async label=>{const file=`${dir}/${name}-${label}.png`;await page.screenshot({path:file});screenshots.push({label,file});};
   try {
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400 && r.url().includes('/_app/'))errors.push(r.url());});
  await page.goto(process.argv[2],{waitUntil:'networkidle'}); await page.waitForTimeout(1200);
   await page.evaluate(()=>{
    window.originalDrop=document.querySelector('.droplet');window.flashEvents=[];
    new MutationObserver(records=>{
     const changes=records.filter(r=>r.attributeName==='data-flash');
     changes.forEach((r,i)=>{
      const next=changes.slice(i+1).find(n=>n.target===r.target);
      const value=next?next.oldValue:r.target.getAttribute('data-flash');
      if(value!==r.oldValue)window.flashEvents.push({value,previous:r.oldValue,time:performance.now()});
     });
    }).observe(window.originalDrop,{attributes:true,attributeOldValue:true,attributeFilter:['data-flash']});
   });
  const sample=()=>page.evaluate(()=>{
   const e=document.querySelector('.droplet'),r=e.getBoundingClientRect(),c=getComputedStyle(e),h=document.querySelector('.specular-primary');
   const hit=(x,y)=>e.contains(document.elementFromPoint(x,y));
    const copyRects=[...document.querySelectorAll('.hero-copy p,.metallic-title,.dock-copy p,.dock-copy h2,.dock-copy .secondary,.status-head span')].flatMap(el=>{const range=document.createRange();range.selectNodeContents(el);return [...range.getClientRects()];});
   const copyClearance=Math.min(...copyRects.map(t=>Math.hypot(Math.max(t.left-r.x-r.width/2,0,r.x+r.width/2-t.right),Math.max(t.top-r.y-r.height/2,0,r.y+r.height/2-t.bottom))-r.width/2));
   return {copyClearance,scroll:scrollY,x:r.x+r.width/2,y:r.y+r.height/2,w:r.width,h:r.height,visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,hit:[[-.25,0],[.25,0],[0,-.25],[0,.25]].every(([x,y])=>hit(r.x+r.width*(.5+x),r.y+r.height*(.5+y))),same:e===window.originalDrop, radius:c.borderRadius, highlight:getComputedStyle(h).translate, material:c.backgroundImage,plus:+getComputedStyle(document.querySelector('.plus')).opacity,gloss:+getComputedStyle(h).opacity};
  });
   const animation=()=>page.evaluate(()=>{
    const e=document.querySelector('.droplet'),hero=document.querySelector('.hero');
    const title=document.querySelector('.metallic-title');
     const filters=[];let opacity=1;for(let node=title;node;node=node.parentElement){filters.push(getComputedStyle(node).filter);opacity*=Number(getComputedStyle(node).opacity);}
    const blur=filters.reduce((sum,filter)=>sum+[...filter.matchAll(/blur\(([\d.]+)px\)/g)].reduce((n,m)=>n+Number(m[1]),0),0);
      return {progress:Math.max(0,Math.min(1,(scrollY-hero.offsetTop)/Math.max(1,hero.offsetHeight-innerHeight))),icon:parseFloat(getComputedStyle(e).getPropertyValue('--icon-progress')),blur,opacity,filters,size:e.getBoundingClientRect().width};
   });
   const idle=await sample(); await screenshot('idle');
  await page.mouse.move(idle.x+65,idle.y-40); await page.waitForTimeout(450); const pulled=await sample();
  assert.notEqual(pulled.radius,idle.radius,'pointer must deform the actual outer water silhouette');
  assert.notEqual(pulled.highlight,idle.highlight,'pointer must shift reflected light, not only float');
   await page.mouse.move(0,0); await page.waitForTimeout(700);
   const heroRange=await page.locator('.hero').evaluate(e=>({top:e.offsetTop,range:Math.max(1,e.offsetHeight-innerHeight)}));
   const seek=async progress=>{await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),heroRange.top+heroRange.range*progress);await page.waitForTimeout(300);};
   // Observe attribute edges in-page: polling can miss the entire 120ms pulse.
   for(let crossing=0;crossing<2;crossing++){
    await page.evaluate(()=>{window.flashEvents=[];});
    await seek(.25);await seek(.45);await seek(.15);await seek(0);await page.waitForTimeout(180);
    const events=await page.evaluate(()=>window.flashEvents);
    fs.writeFileSync(`${dir}/${name}-flash-${crossing}.json`,JSON.stringify(events,null,2));
    assert.deepEqual(events.filter(e=>['charge','return'].includes(e.value)).map(e=>e.value),['charge','return'],'exactly one charge/return per idle crossing; no repeats away from idle');
    for(const value of ['charge','return']){
     const index=events.findIndex(e=>e.value===value),duration=events[index+1]?.time-events[index].time;
     assert(duration>=100&&duration<=170,`${name} ${value} lasts 120ms (timer/frame tolerance): ${duration}ms`);
    }
   }
   const animationStates=[];
   for(const progress of [0,.4,.79,.8,.85,.9,.95,1,.95,.9,.85,.8,.4,0]){
    await seek(progress);const a=await animation();animationStates.push(a);
    const expected=Math.max(0,Math.min(1,(a.progress-.8)/.2));
    assert(Number.isFinite(a.icon)&&Math.abs(a.icon-expected)<.035,`--icon-progress reveals only at .8..1, reversibly: ${JSON.stringify(a)}`);
    if(progress>=.8)assert(Math.abs(a.size-116)<1,`orb stays 116px after .8: ${JSON.stringify(a)}`);
    if([0,.8,.9,1].includes(progress))await screenshot(`reveal-${animationStates.length}`);
   }
   assert(animationStates[0].blur<.1&&animationStates.at(-1).blur<.1,'title starts and returns unblurred');
    assert(animationStates.every(a=>a.blur<.1&&a.opacity>=.84),'title remains crisp and readable at every reveal state');
    assert(Math.abs(animationStates[0].size-animationStates.at(-1).size)<2,'reverse restores idle size');
    const continuous=[];
    for(let i=0;i<=40;i++){
     await seek(i/40);const s=await sample();continuous.push(s);
     if(i){const previous=continuous[i-1];assert(s.w<=previous.w+1&&Math.abs(s.w-previous.w)<8,'forward shrink is continuous, never jumps back to idle');assert(Math.hypot(s.x-previous.x,s.y-previous.y)<20,'hero position changes continuously');}
    }
    fs.writeFileSync(`${dir}/${name}-continuity.json`,JSON.stringify(continuous,null,2));
    fs.writeFileSync(`${dir}/${name}-animation.json`,JSON.stringify(animationStates,null,2));
    await seek(0);await seek(.08);const forwardSize=(await sample()).w;
    await seek(.2);await seek(.08);const reverseSize=(await sample()).w;
    assert(reverseSize>forwardSize&&reverseSize<forwardSize*1.04,'reverse adds a subtle scrubbed overshoot');
    await seek(0);
  if(mobile){const cdp=await context.newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:170,y:720}]});for(let y=690;y>170;y-=30){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:170,y}]});await page.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}else await page.mouse.wheel(0,700);
  await page.waitForTimeout(1200); assert((await sample()).scroll>350,'native gesture advances');
  const max=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight),states=[];
  for(const direction of [1,-1])for(let i=0;i<=32;i++){
   const y=max*(direction===1?i/32:1-i/32);await page.evaluate(y=>scrollTo(0,y),y);await page.waitForTimeout(65);const s=await sample();states.push(s);
    assert(s.same,'animation must retain the same droplet');
    if(!s.visible||!s.hit||(mobile&&s.copyClearance<20))overlaps.push({direction,...s});
    const a=await animation();if(a.progress>=.8)assert(Math.abs(a.size-116)<1,`constant 116px orb throughout transit: ${JSON.stringify(a)}`);
   assert(s.gloss>.3,'gloss must survive docking');assert.equal(s.material,idle.material,'no matte replacement');
    if(direction===1&&[12,20,26,32].includes(i))await screenshot(`scroll-${i}`);
  }
  await page.evaluate(y=>scrollTo(0,y),max);await page.waitForTimeout(300);
   const dock=await page.locator('.status-orbit').boundingBox(),end=await sample();assert(end.plus>.98);assert(Math.abs(end.x-dock.x-dock.width/2)<3&&Math.abs(end.y-dock.y-dock.height/2)<3,'same droplet lands in status orbit');
   for(let i=0;i<5;i++){
    await page.waitForTimeout(200);const held=await sample();assert(held.plus>.98&&Math.abs(held.w-116)<1,'final dock holds size and plus');
    const bars=await page.locator('.plus span').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {w:r.width,h:r.height,background:getComputedStyle(el).backgroundColor};}));
    assert(bars.length===2&&bars.every(b=>Math.max(b.w,b.h)>35&&Math.min(b.w,b.h)>3&&b.background==='rgb(255, 255, 255)'),'plus has two visible solid strokes');
   }
   await screenshot('final-dock');
  assert.equal(await page.locator('.mini-drop').count(),0,'no second matte droplet');
    const chooser=page.waitForEvent('filechooser');
    if(mobile)await page.locator('.droplet').tap();
    else {await page.locator('.droplet').focus();await page.keyboard.press('Enter');}
    await chooser;
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(200);const reduced=await sample();await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(200);const reduced2=await sample();assert.equal(reduced.x,reduced2.x);assert.equal(reduced.y,reduced2.y);assert.equal(reduced.radius,reduced2.radius);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(500);assert((await sample()).plus<.01,JSON.stringify(await sample()));assert.deepEqual(errors,[]);
   fs.writeFileSync(`${dir}/${name}-states.json`,JSON.stringify({idle,pulled,states,end,errors,overlaps},null,2));
   assert.equal(overlaps.length,0,`${name}: clipping/hit/text-clearance regressions with constant 116px transit orb; see ${name}-states.json`);
    console.log(`${name}: flash crossings/timing, persistent plus strokes, crisp title, constant size, 66 forward/reverse samples, native gesture, picker, reduced motion PASS`);
   }catch(error){failures.push(`${name}: ${error.stack}`);await screenshot('failure');}
   finally{
    fs.writeFileSync(`${dir}/${name}-overlaps.json`,JSON.stringify(overlaps,null,2));
    const video=page.video();await context.close();await video.saveAs(`${dir}/${name}.webm`);
    const sheet=await browser.newPage({viewport:{width:1200,height:900}});
    try{
     await sheet.setContent(`<html><body style="margin:16px;background:#101827;color:white;font:16px sans-serif"><h1>${name} animation contact sheet</h1><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">${screenshots.map(({label,file})=>`<figure style="margin:0"><figcaption>${label}</figcaption><img style="width:100%" src="data:image/png;base64,${fs.readFileSync(file).toString('base64')}"></figure>`).join('')}</div></body></html>`);
     await sheet.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
     await sheet.screenshot({path:`${dir}/${name}-contact-sheet.png`,fullPage:true});
    }finally{await sheet.close();}
   }
  }
  assert.deepEqual(failures,[],'browser animation regressions');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
