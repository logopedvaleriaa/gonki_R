import { test, expect } from '@playwright/test';
import { createFreeChase, stepFreeChase } from '../src/free-chase.js';

test('Новые машины появляются один раз после участка пути, их можно обогнать', () => {
  const chase = createFreeChase(3000, 4500);
  expect(chase.at).toBeGreaterThanOrEqual(3090);
  expect(chase.at).toBeLessThanOrEqual(3180);
  let distance = chase.at - 1;
  const input = () => ({ playerDistance: distance, playerAdvance: .6, total: 4500, speedLimit: () => 42 });
  expect(stepFreeChase(chase, input(), .02)).toBe(false);
  expect(chase.distances).toEqual([]);
  distance += 2;
  expect(stepFreeChase(chase, input(), .02)).toBe(true);
  expect(chase.distances.every(d => d - distance > 27 && d - distance < 42)).toBe(true);
  for (let i = 0; i < 1200; i++) {
    distance += .6;
    expect(stepFreeChase(chase, input(), .02)).toBe(false);
  }
  expect(chase.place).toBe(1);
  const saved = JSON.stringify(chase);
  expect(stepFreeChase(chase, input(), 0)).toBe(false);
  expect(JSON.stringify(chase)).toBe(saved);
});

test('В старом сохранении у самого финиша новые машины не появляются', () => {
  const chase = createFreeChase(4490, 4500);
  expect(chase.at).toBeNull();
  expect(stepFreeChase(chase, { playerDistance: 4500, playerAdvance: 1, total: 4500 }, .02)).toBe(false);
  expect(chase.distances).toEqual([]);
});

test('Третий круг: сюрприз, движение машин, пауза, сохранение и отдельный результат', async ({ page }) => {
  await page.clock.install();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/src/world.js*', async route => {
    const response = await route.fetch();
    const body = (await response.text()).replace(/renderer\.render\(scene,\s*camera\)/,
      `if(window.__drawGuests)renderer.render(scene,camera);window.__guestProbe=()=>circuit.root.children.filter(o=>o.name==='free-lap-guest').map(o=>({visible:o.visible,position:o.position.toArray(),wheel:o.userData.wheels[0].userData.rotor.rotation.x}))`);
    await route.fulfill({ response, body });
  });
  await page.addInitScript(() => {
    if (!localStorage.getItem('racing-cup-v1')) localStorage.setItem('racing-cup-v1', JSON.stringify({
      version: 2, started: true, settings: { sound: false, warmup: false },
    }));
  });
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('racing-cup-v1')));
  await page.goto('/'); await page.locator('#continue').click(); await page.locator('#home').click();
  await page.evaluate(() => {
    const key = 'racing-cup-v1', s = JSON.parse(localStorage.getItem(key)), q = s.circuitRun;
    const finish = q.total * 2 / 3;
    q.distance = finish + 200; q.pitDone = [0, 1, 2, 3, 4, 5, 6, 7]; q.racePlace = 2; q.freeLap = true;
    q.heading = 0; q.lateral = 0;
    q.freeChase = { at: finish + 202, distances: [], motion: { pace: 18, speeds: [0, 0] } };
    localStorage.setItem(key, JSON.stringify(s));
  });
  await page.reload(); await page.locator('#continue').click();
  await page.clock.runFor(100);
  expect((await page.evaluate(() => window.__guestProbe())).every(o => !o.visible)).toBe(true);
  await expect(page.locator('#gp-place')).toBeHidden();
  await page.keyboard.down('ArrowUp'); await page.clock.runFor(1600); await page.keyboard.up('ArrowUp');
  await expect(page.locator('#gp-banner')).toHaveText('Новые соперники на трассе!');
  await expect(page.locator('#gp-place')).toBeVisible();
  await expect(page.locator('.gp-race-info small').first()).toHaveText('ПОГОНЯ');
  await expect(page.locator('#gp-activity-hint')).toBeHidden();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const first = await page.evaluate(() => window.__guestProbe());
  expect(first.every(o => o.visible)).toBe(true);
  await page.clock.runFor(500);
  const moving = await page.evaluate(() => window.__guestProbe());
  expect(moving[0].position).not.toEqual(first[0].position);
  expect(moving[0].wheel).not.toBe(first[0].wheel);
  await page.locator('#gp-pause').click();
  const paused = await saved();
  await page.clock.runFor(3000);
  expect((await saved()).circuitRun).toEqual(paused.circuitRun);
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await page.evaluate(() => { window.__drawGuests = true; });
  await page.clock.runFor(40);
  await page.screenshot({ path: 'test-results/free-lap-new-rivals.png' });
  await page.evaluate(() => { window.__drawGuests = false; });
  await page.locator('#home').click();
  const before = await saved();
  await page.reload(); await page.locator('#continue').click(); await page.clock.runFor(40);
  expect((await saved()).circuitRun.freeChase.distances).toEqual(before.circuitRun.freeChase.distances);
  expect((await page.evaluate(() => window.__guestProbe())).every(o => o.visible)).toBe(true);
  expect((await saved()).circuitRun.racePlace).toBe(2);
  const distance = (await saved()).circuitRun.distance;
  await page.clock.runFor(2000);
  expect((await saved()).circuitRun.distance).toBe(distance);
  await page.locator('#home').click();
  await page.evaluate(() => {
    const key = 'racing-cup-v1', s = JSON.parse(localStorage.getItem(key)), q = s.circuitRun;
    q.distance = q.total - 2; q.heading = 0; q.lateral = 0;
    q.freeChase.distances = [q.total - 30, q.total - 20];
    localStorage.setItem(key, JSON.stringify(s));
  });
  await page.reload(); await page.locator('#continue').click();
  await page.keyboard.down('ArrowUp'); await page.clock.runFor(1500); await page.keyboard.up('ArrowUp');
  await expect(page.getByRole('dialog')).toContainText('Погоня на свободном круге: 1 место из 3');
  const result = await saved();
  expect(result.circuitRun.racePlace).toBe(2);
  expect(result.coins).toBe(15);
  expect(result.circuitRun.pitDone).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(errors).toEqual([]);
});
