import { test, expect } from "@playwright/test";
import {solveMemoryGame} from "./helpers/memory.js";
const KEY = "racing-cup-v1";
const run = (p) =>
  p.evaluate((k) => JSON.parse(localStorage.getItem(k)).circuitRun, KEY);
async function start(page, speech = true, draw = false, keyboard = false) {
  await page.clock.install();
  // Test driver steers through bends via the same public physics inputs.
  // Production has no autopilot; the separate physics tests cover no-input behaviour.
  await page.route("**/src/driving.js*", async (route) => {
    const r = await route.fetch();
    let code = (await r.text()).replace(
      "export function stepDriving(",
      "function rawDriving(",
    );
    code += `\nexport function stepDriving(s,input,dt){
      if(window.__testAutoSteer){const angle=clamp(.24-s.speed*.003,.105,.24);input={...input,gas:true,steer:clamp((Math.atan(input.curvature*2.7)-(s.heading+s.slip)*.45-s.lateral*.012)/angle,-1,1)};}
      return rawDriving(s,input,dt);
    }`;
    await route.fulfill({ response: r, body: code });
  });
  await page.addInitScript(() => (window.__testAutoSteer = true));

  if (!draw)
    await page.route("**/src/world.js*", async (route) => {
      const r = await route.fetch();
      await route.fulfill({
        response: r,
        body: (await r.text()).replace(
          /renderer\.render\(scene,\s*camera\)/,
          "",
        ),
      });
    });
  await page.addInitScript(
    ({ KEY, speech }) => {
      if (!localStorage.getItem(KEY))
        localStorage.setItem(
          KEY,
          JSON.stringify({
            version: 2,
            started: true,
            name: "Рома",
            color: "#c83b28",
            settings: { warmup: false, speech, sound: false },
          }),
        );
    },
    { KEY, speech },
  );
  await page.goto("/");
  await page.locator("#continue").click();
  await expect(page.locator("#gp-start")).toBeVisible();
  if(keyboard)await page.keyboard.press("ArrowUp");else await page.locator("#gp-start").click();
  await page.clock.runFor(3200);
}

test('По пути открываются восемь полноценных игр, после каждой сохраняется позиция',async({page})=>{
 await start(page);
 for(const game of ['memory','part','odd','ttt','shadow','route','missing','dobble']){
  await page.clock.runFor(60000);
  const before=await run(page);
  if(game==='memory'){
   await expect(page.locator('#cards')).toBeVisible();
   await page.clock.runFor(5000);expect(await run(page)).toEqual(before);
   await solveMemoryGame(page);
  }
  if(game==='missing'){for(let i=0;i<3;i++){await page.locator('#missing-hide').click();await page.locator('[data-answer="correct"]').click();await page.clock.runFor(800)}}
  if(game==='dobble'){for(let i=0;i<10;i++){const common=await page.locator('.dobble-card').evaluateAll(cards=>{const ids=cards.map(c=>[...c.querySelectorAll('button')].map(b=>b.dataset.picture));return ids[0].find(id=>ids[1].includes(id))});await page.locator(`.dobble-object[data-picture="${common}"]`).first().click();await page.clock.runFor(1000)}}
  if(game==='part'||game==='shadow'||game==='odd')for(let i=0;i<(game==='odd'?10:game==='part'?8:5);i++){await page.locator('[data-answer="correct"]').click();await page.clock.runFor(900)}
  if(game==='ttt'){
   await page.locator('#duel-mode').selectOption('two');
   for(let r=0;r<3;r++){for(const i of [0,3,1,4,2])await page.locator('#ttt button').nth(i).click();await page.getByText(r===2?'Завершить дуэль':'Следующий раунд',{exact:true}).click()}
  }
  if(game==='route'){
   await page.evaluate(()=>{window.seen=[];new MutationObserver(rs=>{for(const r of rs)if(r.target.matches('.landmark.lit')&&document.querySelector('#route-status').textContent.startsWith('Запомни'))window.seen.push([...r.target.parentNode.children].indexOf(r.target))}).observe(document.querySelector('#landmarks'),{subtree:true,attributes:true,attributeFilter:['class']})});
   await page.clock.runFor(4000);await page.locator('#replay').click();
   for(let n=3;n<=5;n++){await page.clock.runFor(n*900+600);const seq=await page.evaluate(n=>window.seen.slice(-n),n);expect(seq).toHaveLength(n);for(const i of seq)await page.locator('.landmark').nth(i).click();await page.clock.runFor(n===5?600:950)}
  }
  await expect(page.locator('#gp-start')).toBeVisible();
  expect((await run(page)).distance).toBe(before.distance);
  await page.clock.runFor(2000);expect((await run(page)).distance).toBe(before.distance);
  await page.locator('#gp-start').click();await page.clock.runFor(3200);
 }
 expect((await run(page)).pitDone).toEqual([0,1,2,3,4,5,6,7]);
 await page.clock.runFor(120000);await expect(page.getByRole('dialog')).toContainText('место из 3');
});
test('Незавершённая игра открывается повторно после перезагрузки',async({page})=>{
 await start(page);await page.clock.runFor(60000);await expect(page.locator('#cards')).toBeVisible();
 const before=await run(page);await page.reload();await page.locator('#continue').click();await page.locator('#gp-start').click();
 await expect(page.locator('#cards')).toBeVisible();expect((await run(page)).distance).toBe(before.distance);expect((await run(page)).pitDone).toEqual([]);
});
test('Трасса без куполов и управление на телефоне',async({page})=>{
 await start(page,true,true);await page.clock.runFor(500);await page.screenshot({path:'test-results/grand-prix-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.clock.runFor(100);expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(390);await page.screenshot({path:'test-results/grand-prix-mobile.png'});
});

test('Стрелка вперёд запускает гонку и продолжает после Мемори',async({page})=>{
 await start(page,true,false,true);
 await expect(page.locator('#gp-start-card')).toBeHidden();
 await page.clock.runFor(60000);await expect(page.locator('#cards')).toBeVisible();await solveMemoryGame(page);
 const before=await run(page);
 await expect(page.locator('#gp-start')).toBeVisible();await page.clock.runFor(1000);expect((await run(page)).distance).toBe(before.distance);
 await page.keyboard.down('ArrowUp');await page.clock.runFor(1500);await page.keyboard.up('ArrowUp');
 expect((await run(page)).distance).toBeGreaterThan(before.distance);await expect(page.locator('#gp-start-card')).toBeHidden();
});
