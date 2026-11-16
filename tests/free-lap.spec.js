import {test,expect} from '@playwright/test';
const KEY='racing-cup-v1';
test('После всех игр — начало свободного третьего круга без остановок, затем итог',async({page})=>{
 await page.clock.install();await page.route('**/src/world.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace(/renderer\.render\(scene,\s*camera\)/,'')})});
 await page.addInitScript(()=>{if(!localStorage.getItem('racing-cup-v1'))localStorage.setItem('racing-cup-v1',JSON.stringify({version:2,started:true,settings:{warmup:false,sound:false}}))});
 await page.goto('/');await page.locator('#continue').click();await page.locator('#home').click();
 await page.evaluate(KEY=>{const s=JSON.parse(localStorage.getItem(KEY)),q=s.circuitRun,finish=q.total*2/3;q.distance=finish-2;q.pitDone=[0,1,2,3,4,5,6,7];q.rivals=[finish+120,finish+300];q.heading=0;q.lateral=0;localStorage.setItem(KEY,JSON.stringify(s))},KEY);
 await page.reload();await page.locator('#continue').click();await page.keyboard.down('ArrowUp');await page.clock.runFor(1500);await page.keyboard.up('ArrowUp');
 await expect(page.locator('#gp-lap')).toContainText('3');await expect(page.locator('#gp-lap')).toContainText('свободный');
 await expect(page.locator('#gp-place')).toBeHidden();await expect(page.locator('#gp-activity-hint')).toBeHidden();await expect(page.getByRole('dialog')).toHaveCount(0);
 const markers=await page.locator('#gp-track-map').evaluate(canvas=>{
  const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let rivals=0,player=0;
  for(let i=0;i<pixels.length;i+=4){if((pixels[i]===126&&pixels[i+1]===183&&pixels[i+2]===219)||(pixels[i]===250&&pixels[i+1]===250&&pixels[i+2]===243))rivals++;if(pixels[i]===243&&pixels[i+1]===184&&pixels[i+2]===113)player++;}
  return {rivals,player};
 });
 expect(markers.rivals).toBe(0);expect(markers.player).toBeGreaterThan(0);
 let q=await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).circuitRun,KEY);expect(q.freeLap).toBe(true);expect(q.finished).toBe(false);expect(q.racePlace).toBe(3);
 await page.locator('#home').click();await page.reload();await page.locator('#continue').click();await expect(page.locator('#gp-lap')).toContainText('свободный');
 await page.locator('#home').click();await page.evaluate(KEY=>{const s=JSON.parse(localStorage.getItem(KEY));s.circuitRun.distance=s.circuitRun.total-1;localStorage.setItem(KEY,JSON.stringify(s))},KEY);
 await page.reload();await page.locator('#continue').click();await page.keyboard.down('ArrowUp');await page.clock.runFor(1000);await page.keyboard.up('ArrowUp');
 await expect(page.getByRole('dialog')).toContainText('место из 3');expect(await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).coins,KEY)).toBe(10);
 expect((await page.evaluate(KEY=>JSON.parse(localStorage.getItem(KEY)).circuitRun,KEY)).racePlace).toBe(3);
});
