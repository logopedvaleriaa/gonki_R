import { test, expect } from '@playwright/test';

test('Выход из любой мини-игры отменяет таймеры, ответы ИИ и отложенные награды', async ({ page }) => {
  await page.clock.install();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/src/world.js*', async route => {
    const r = await route.fetch();
    await route.fulfill({ response: r, body: (await r.text()).replace(/renderer\.render\(scene,\s*camera\)/, '') });
  });
  await page.addInitScript(() => localStorage.setItem('racing-cup-v1', JSON.stringify({
    version: 2, settings: { sound: false, speech: false, warmup: false, remoteLesson: false },
  })));
  await page.goto('/');
  await page.locator('#free').click();
  const games = await page.locator('[data-game]').evaluateAll(buttons => buttons.map(b => b.dataset.game));
  for (const game of games) {
    await test.step(game, async () => {
      await page.locator(`[data-game="${game}"]`).click();
      if (game === 'memory') {
        const names = await page.locator('.memory-front img').evaluateAll(imgs => imgs.map(i => i.alt));
        await page.locator('.card').nth(0).click();
        await page.locator('.card').nth(names.findIndex(word => word !== names[0])).click();
      }
      if (game === 'ttt') await page.locator('#ttt button').first().click();
      if (game === 'race') await page.locator('[data-race="delivery"]').click();
      if (game === 'maze') await page.locator('#hint').click();
      if (game === 'assembly') for (let i = 0; i < 5; i++) {
        await page.locator(`[data-part="${i}"]`).click();
        await page.locator(`[data-slot="${i}"]`).click();
      }
      if (game === 'traffic') await page.locator('#traffic-start').click();
      if (game === 'missing') await page.locator('#missing-hide').click();
      if (['part', 'shadow', 'odd', 'missing'].includes(game)) await page.locator('[data-answer="correct"]').click();
      if (game === 'dobble') {
        const common = await page.locator('.dobble-card').evaluateAll(cards => {
          const ids = cards.map(c => [...c.querySelectorAll('button')].map(b => b.dataset.picture));
          return ids[0].find(id => ids[1].includes(id));
        });
        await page.locator(`[data-picture="${common}"]`).first().click();
      }
      await page.locator(game === 'race' ? '#exit-race' : '#back').click();
      await page.clock.runFor(3500);
      await expect(page.locator('[data-game]')).toHaveCount(games.length);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('racing-cup-v1')).coins || 0)).toBe(0);
      expect(errors).toEqual([]);
    });
  }
});
