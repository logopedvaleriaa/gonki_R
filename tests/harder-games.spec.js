import {test,expect} from '@playwright/test';
import {oddRounds,fragmentChoices} from '../src/extra-games.js';
import {WORDS} from '../src/speech.js';
test('В десяти раундах среди 6–12 картинок ровно один лишний предмет',()=>{
 const rounds=oddRounds();expect(rounds).toHaveLength(10);
 const positions=rounds.map(r=>r.choices.findIndex(w=>w.id===r.odd));
 expect(positions.slice(1).every((position,i)=>position!==positions[i])).toBe(true);
 expect(rounds.map(r=>r.choices.length)).toEqual([6,6,6,8,8,8,10,10,12,12]);
 for(const r of rounds){expect(r.choices.filter(w=>w.id===r.odd)).toHaveLength(1);expect(r.choices.filter(w=>w.id!==r.odd).every(w=>r.same.includes(w.id))).toBe(true)}
 for(const w of WORDS){const choices=fragmentChoices(w,WORDS,6);expect(choices).toHaveLength(6);expect(new Set(choices.map(w=>w.id)).size).toBe(6);expect(choices.filter(x=>x.id===w.id)).toHaveLength(1)}
});
test('Сложные фрагменты и поиск лишнего: картинки видны, игры завершаются',async({page})=>{
 await page.clock.install();
 await page.route('**/src/world.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace(/renderer\.render\(scene,\s*camera\)/,'')})});
 await page.addInitScript(()=>{if(!localStorage.getItem('racing-cup-v1'))localStorage.setItem('racing-cup-v1',JSON.stringify({version:2,settings:{speech:false,sound:false}}))});
 await page.goto('/');await page.locator('#free').click();await page.locator('[data-game="part"]').click();
 for(let i=0;i<8;i++){
  await expect(page.locator('#picture-round')).toHaveText(`${i+1} из 8`);
  await expect(page.locator('#picture-choices button')).toHaveCount(6);
  await expect(page.locator('[data-answer="correct"]')).toBeEnabled();
  expect(await page.locator('#picture-target canvas').evaluate(c=>{const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<a.length;i+=4)if(Math.min(a[i],a[i+1],a[i+2])<226)n++;return n})).toBeGreaterThan(2000);
  if(i===0)await page.screenshot({path:'test-results/harder-fragment.png'});
  await page.locator('[data-answer="correct"]').click();await page.clock.runFor(900);
 }
 await expect(page.getByRole('dialog')).toContainText('+10');await page.getByText('Выбрать мини-игру',{exact:true}).click();await page.locator('[data-game="odd"]').click();
 for(let i=0;i<10;i++){
  await expect(page.locator('#extra-round')).toHaveText(`${i+1} из 10`);
  await expect(page.locator('#odd-hint')).toHaveCount(0);await expect(page.locator('[data-answer="correct"]')).toHaveCount(1);
  await expect(page.locator('.odd-object')).toHaveCount([6,6,6,8,8,8,10,10,12,12][i]);
  const layout=await page.locator('.odd-field').evaluate(field=>{
   const columns=getComputedStyle(field).gridTemplateColumns.split(' ').length;
   return {filled:field.children.length%columns===0,ordered:[...field.children].every(b=>getComputedStyle(b).transform==='none'&&getComputedStyle(b).gridColumnStart==='auto')};
  });
  expect(layout).toEqual({filled:true,ordered:true});
  if(i===0)await page.screenshot({path:'test-results/odd-grid-desktop.png',fullPage:true});
  if(i===9){await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/odd-search-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390)}
  await page.locator('[data-answer="correct"]').click();await page.clock.runFor(800);
 }
 await expect(page.getByRole('dialog')).toContainText('+10');
});
