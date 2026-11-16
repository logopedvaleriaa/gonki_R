import {test,expect} from '@playwright/test';
test('Крестик и нолик не скрывают картинки, три раунда и сброс',async({page})=>{
 await page.clock.install();await page.route('**/src/world.js*',async route=>{const r=await route.fetch();await route.fulfill({response:r,body:(await r.text()).replace(/renderer\.render\(scene,\s*camera\)/,'')})});
 await page.goto('/');await page.locator('#free').click();await page.locator('[data-game="ttt"]').click();await page.locator('#duel-mode').selectOption('two');
 const image=await page.locator('#ttt button').first().locator('img').getAttribute('src');
 for(let r=0;r<3;r++){
  for(const [n,i] of [0,3,1,4,2].entries()){
   await page.locator('#ttt button').nth(i).click();await expect(page.locator('#ttt img')).toHaveCount(9);
   await expect(page.locator('#ttt button').nth(i).locator('.duel-mark')).toHaveText(n%2===0?'×':'○');
   await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  if(r===0){await expect(page.locator('#ttt button').first().locator('img')).toHaveAttribute('src',image);await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/ttt-marks-pictures-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390)}
  await expect(page.locator('#ttt .win')).toHaveCount(3);
  await page.getByText(r===2?'Завершить дуэль':'Следующий раунд',{exact:true}).click();
  if(r<2)await expect(page.locator('.duel-mark')).toHaveCount(0);
 }
 await expect(page.getByRole('dialog')).toContainText('+10');
});
