import { test, expect } from '@playwright/test';

const KEY = 'racing-cup-v1';
test('Реальные стрелки: обгон, торможение, пауза и сохранение соперников', async ({ page }) => {
  await page.clock.install();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/src/world.js*', async route => {
    const r = await route.fetch();
    await route.fulfill({ response: r, body: (await r.text()).replace(/renderer\.render\(scene,\s*camera\)/, '') });
  });
  await page.addInitScript(() => {
    if (!localStorage.getItem('racing-cup-v1')) localStorage.setItem('racing-cup-v1', JSON.stringify({
      version: 2, started: true, settings: { warmup: false, sound: false },
    }));
  });
  const saved = () => page.evaluate(k => JSON.parse(localStorage.getItem(k)).circuitRun, KEY);
  await page.goto('/');
  await page.locator('#continue').click();
  await expect(page.locator('#gp-place')).toContainText('3');
  await page.keyboard.down('ArrowUp');
  await page.clock.runFor(8200);
  await page.keyboard.up('ArrowUp');
  // Gas alone overtakes at least one car; the bend still requires real steering.
  expect(parseInt(await page.locator('#gp-place').innerText())).toBeLessThan(3);
  await page.keyboard.down('ArrowDown');
  await page.clock.runFor(10000);
  await page.keyboard.up('ArrowDown');
  await expect(page.locator('#gp-place')).toHaveText('3 / 3');
  await page.locator('#gp-pause').click();
  const paused = await saved();
  await page.clock.runFor(4000);
  expect(await saved()).toEqual(paused);
  await page.getByRole('button', { name: 'Продолжить', exact: true }).click();
  await page.locator('#home').click();
  const beforeReload = await saved();
  await page.reload();
  await page.locator('#continue').click();
  expect((await saved()).rivals).toEqual(beforeReload.rivals);
  expect((await saved()).distance).toBe(beforeReload.distance);
  await expect(page.locator('#gp-speed')).toContainText('0');
  await page.clock.runFor(4000);
  expect((await saved()).rivals).toEqual(beforeReload.rivals);
  expect(errors).toEqual([]);
});
