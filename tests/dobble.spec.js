import { test, expect } from '@playwright/test';
import { dobbleRounds, DOBBLE_ROUNDS } from '../src/dobble.js';
import { WORDS } from '../src/speech.js';
import { memoryPictures } from '../src/memory.js';
import { activitiesForRun, RACE_ACTIVITIES } from '../src/race-activities.js';

test.use({ hasTouch: true });

test('Доббль: ровно одно совпадение, уникальные картинки, нарастающая сложность', () => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    for (const material of ['words', 'phrases']) {
      const pictures = memoryPictures({ material, speechGroup: 'начало', words: 'рак' }, 17);
      for (let attempt = 0; attempt < 20; attempt++) {
        const rounds = dobbleRounds(pictures, difficulty);
        expect(rounds).toHaveLength(DOBBLE_ROUNDS);
        expect(new Set(rounds.map(r => r.common)).size).toBe(DOBBLE_ROUNDS);
        expect(rounds.at(-1).cards[0].length).toBe(rounds[0].cards[0].length + 2);
        for (const round of rounds) {
          const [a, b] = round.cards.map(card => card.map(item => item.id));
          expect(a.filter(id => b.includes(id))).toEqual([round.common]);
          for (const card of round.cards) {
            expect(new Set(card.map(item => item.id)).size).toBe(card.length);
            expect(card.every(item => WORDS.some(w => w.id === item.id) && item.word)).toBe(true);
          }
        }
      }
    }
  }
});

test('Новая остановка сохраняет старые индексы и уже начатый свободный круг', () => {
  expect(activitiesForRun({}).at(-1).game).toBe('dobble');
  const old = { freeLap: true, pitDone: [0, 1, 2, 3, 4, 5, 6] };
  expect(activitiesForRun(old)).toHaveLength(7);
  expect(old.pitDone).toHaveLength(7);
  expect(RACE_ACTIVITIES.slice(0, 7).map(a => a.game)).toEqual(['memory', 'part', 'odd', 'ttt', 'shadow', 'route', 'missing']);
  expect(RACE_ACTIVITIES.at(-1).at - RACE_ACTIVITIES.at(-2).at).toBeGreaterThan(.06);
});

async function prepare(page, started = false) {
  await page.clock.install();
  await page.route('**/src/world.js*', async route => {
    const r = await route.fetch();
    await route.fulfill({ response: r, body: (await r.text()).replace(/renderer\.render\(scene,\s*camera\)/, '') });
  });
  await page.addInitScript(started => {
    if (!localStorage.getItem('racing-cup-v1')) localStorage.setItem('racing-cup-v1', JSON.stringify({
      version: 2, started, settings: { speech: true, warmup: false, sound: false },
    }));
  }, started);
  await page.goto('/');
}

async function shared(page) {
  const cards = await page.locator('.dobble-card').evaluateAll(cards => cards.map(card =>
    [...card.querySelectorAll('button')].map(b => b.dataset.picture)));
  const common = cards[0].filter(id => cards[1].includes(id));
  expect(common).toHaveLength(1);
  return common[0];
}

async function solve(page) {
  for (let round = 0; round < DOBBLE_ROUNDS; round++) {
    await expect(page.locator('#dobble-round')).toHaveText(`Раунд ${round + 1} из 10`);
    const common = await shared(page);
    const target = page.locator(`.dobble-card:nth-child(${round % 2 + 1}) [data-picture="${common}"]`);
    if (round % 3 === 0) { await target.focus(); await target.press('Enter'); }
    else if (round % 3 === 1) await target.tap();
    else await target.click();
    await expect(page.locator('.dobble-found')).toHaveCount(2);
    await expect(page.locator('.dobble-object:enabled')).toHaveCount(0);
    await page.clock.runFor(1000);
  }
}

test('Доббль: 10 раундов, картинки, ошибка без штрафа, подписи, перезапуск и касание', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await prepare(page);
  await page.locator('#free').click();
  await page.locator('[data-game="dobble"]').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const common = await shared(page);
  await page.locator(`.dobble-object:not([data-picture="${common}"])`).first().click();
  await expect(page.locator('#dobble-round')).toHaveText('Раунд 1 из 10');
  await expect(page.locator('.dobble-found')).toHaveCount(0);
  await page.locator('[data-material="phrases"]').click();
  await page.locator('#picture-captions').check();
  await expect(page.locator('.object-caption:visible')).toHaveCount(8);
  await page.locator('#picture-captions').uncheck();
  await expect(page.locator('.object-caption:visible')).toHaveCount(0);
  await page.locator('[data-material="words"]').click();
  await page.screenshot({ path: 'test-results/dobble-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/dobble-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  expect(await page.locator('.dobble-object img').evaluateAll(imgs => imgs.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
  // Start over during the success delay: the old timeout must not skip a round.
  await page.locator(`[data-picture="${await shared(page)}"]`).first().dispatchEvent('click');
  await page.locator('#dobble-restart').click();
  await page.clock.runFor(1200);
  await expect(page.locator('#dobble-round')).toHaveText('Раунд 1 из 10');
  await solve(page);
  await expect(page.getByRole('dialog')).toContainText('+10 монет');
  await page.clock.runFor(2000);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('racing-cup-v1')).coins)).toBe(10);
  expect(errors).toEqual([]);
});

test('Доббль на трассе: гонка заморожена, возврат в ту же точку, одна награда, ручное продолжение', async ({ page }) => {
  await prepare(page, true);
  await page.locator('#continue').click();
  await page.locator('#home').click();
  await page.evaluate(() => {
    const key = 'racing-cup-v1', state = JSON.parse(localStorage.getItem(key)), run = state.circuitRun;
    run.distance = run.total * 2 / 3 * .97;
    run.pitDone = [0, 1, 2, 3, 4, 5, 6];
    run.heading = 0; run.lateral = 0;
    localStorage.setItem(key, JSON.stringify(state));
  });
  await page.reload(); await page.locator('#continue').click();
  await expect(page.locator('#gp-activity-name')).toHaveText('Доббль');
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#dobble-round')).toBeVisible();
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('racing-cup-v1')));
  const before = await saved();
  await page.clock.runFor(5000);
  expect((await saved()).circuitRun).toEqual(before.circuitRun);
  await page.reload(); await page.locator('#continue').click(); await page.keyboard.press('ArrowUp');
  await expect(page.locator('#dobble-round')).toHaveText('Раунд 1 из 10');
  await solve(page);
  await expect(page.locator('#gp-start')).toBeVisible();
  const after = await saved();
  expect(after.circuitRun.pitDone).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(after.circuitRun.distance).toBe(before.circuitRun.distance);
  expect(after.coins - before.coins).toBe(10);
  await page.clock.runFor(2500);
  expect((await saved()).circuitRun.distance).toBe(after.circuitRun.distance);
  await page.keyboard.down('ArrowUp'); await page.clock.runFor(1200); await page.keyboard.up('ArrowUp');
  expect((await saved()).circuitRun.distance).toBeGreaterThan(after.circuitRun.distance);
  expect((await saved()).coins).toBe(after.coins);
});
