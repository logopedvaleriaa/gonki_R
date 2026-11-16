import {test,expect} from '@playwright/test';
test('Обложка, повороты, разметка и дорожный знак: стабильные повторные кадры',async({page})=>{
 await page.clock.install();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/src/world.js*',async route=>{
  const r=await route.fetch();const code=(await r.text()).replace(/renderer\.render\(scene,\s*camera\)/,`renderer.render(scene,camera);window.__sceneCheck={view:(d)=>{circuit.update(d,0,[d+20,d+40],0,10);renderer.render(scene,camera)},activity:(n,gap)=>circuit.activity(n,gap)}`);
  await route.fulfill({response:r,body:code});
 });
 await page.addInitScript(()=>{if(!localStorage.getItem('racing-cup-v1'))localStorage.setItem('racing-cup-v1',JSON.stringify({version:2,started:true,color:'#d35432',settings:{sound:false,warmup:false}}));});
 await page.goto('/');await page.clock.runFor(40);
 await expect(page.locator('#start')).toBeVisible();
 await page.screenshot({path:'test-results/cover-new-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(40);await page.screenshot({path:'test-results/cover-new-mobile.png'});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);
 await page.setViewportSize({width:1280,height:800});await page.locator('#continue').click();await page.clock.runFor(40);
 await page.evaluate(()=>document.querySelector('#gp-start-card').hidden=true);
 await page.clock.pauseAt(new Date(await page.evaluate(()=>Date.now())+10000));
 for(const [name,distance] of [['start',0],['bend',170],['hairpin',375],['second-bend',850]]){
  await page.evaluate(d=>window.__sceneCheck.view(d),distance);
  await page.screenshot({path:`test-results/stability-${name}.png`});
  await page.evaluate(d=>window.__sceneCheck.view(d),distance);
  const a=await page.screenshot({path:`test-results/${name}-a.png`});
  await page.evaluate(d=>window.__sceneCheck.view(d),distance);
  const b=await page.screenshot({path:`test-results/${name}-b.png`});expect(a.equals(b),`Неподвижный кадр ${name} стабилен`).toBe(true);
 }
 await page.locator('#home').click();
 await page.evaluate(()=>{const k='racing-cup-v1',s=JSON.parse(localStorage.getItem(k));s.circuitRun.distance=180;localStorage.setItem(k,JSON.stringify(s));});
 await page.reload();await page.locator('#continue').click();await page.clock.runFor(50);
 await page.evaluate(()=>document.querySelector('#gp-start-card').hidden=true);
 await expect(page.locator('#gp-activity-hint')).toBeVisible();await expect(page.locator('#gp-activity-name')).toHaveText('Мемори');
 await page.screenshot({path:'test-results/approaching-game-sign.png'});
 expect(errors).toEqual([]);
});
