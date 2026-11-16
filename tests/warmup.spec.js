import { test, expect } from "@playwright/test";
const KEY = "racing-cup-v1";
test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.route("**/src/world.js*", async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      response: r,
      body: (await r.text()).replace(/renderer\.render\(scene,\s*camera\)/, ""),
    });
  });
});
test("Новая игра начинается с гимнастики, без подтверждений слов", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.locator("#start").click();
  await page.locator("#name").fill("Рома");
  await page.locator("#go").click();
  await expect(page.locator("h1")).toHaveText("Артикуляционная гимнастика");
  await expect(page.locator("[data-exercise]")).toHaveCount(16);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("#warmup-clear").click();
  await expect(page.locator("#warmup-begin")).toBeDisabled();
  await page.locator('[data-exercise="frog"]').click();
  await page.locator('[data-exercise="sail"]').click();
  await expect(page.locator("#warmup-count")).toHaveText("Выбрано: 2");
  await page.locator("#warmup-begin").click();
  await expect(page.locator("h1")).toHaveText("Лягушка");
  await page.clock.runFor(30000);
  await expect(page.locator("h1")).toHaveText("Лягушка");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("#warmup-next").click();
  await expect(page.locator("h1")).toHaveText("Парус");
  await page.locator("#warmup-prev").click();
  await expect(page.locator("h1")).toHaveText("Лягушка");
  await page.locator("#warmup-next").click();
  await page.locator("#warmup-next").click();
  await expect(page.locator("#gp-start")).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("Избранное, выбор и свои подсказки сохраняются", async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("racing-cup-v1"))
      localStorage.setItem(
        "racing-cup-v1",
        JSON.stringify({ version: 2, started: true }),
      );
  });
  await page.goto("/");
  await page.locator("#continue").click();
  await page.locator('[data-favorite="frog"]').click();
  await page.locator('[data-favorite="mushroom"]').click();
  await page.locator("#warmup-favorites").click();
  await expect(page.locator("#warmup-count")).toHaveText("Выбрано: 2");
  await page.reload();
  await page.locator("#continue").click();
  await expect(page.locator('[data-favorite="frog"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('[data-exercise="mushroom"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#warmup-begin").click();
  await page.locator(".warmup-note summary").click();
  await page.locator("#warmup-note-text").fill("Повторяем за логопедом");
  await page.locator("#warmup-note-save").click();
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).settings.warmupNotes.frog,
      KEY,
    ),
  ).toBe("Повторяем за логопедом");
  await page.locator("#warmup-next").click();
  await expect(page.locator("h1")).toHaveText("Грибок");
  await page.locator("#warmup-next").click();
  await expect(page.locator("#gp-start")).toBeVisible();
});
test("Можно пройти все упражнения и вернуться на прежнее место без изменения наград", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("racing-cup-v1"))
      localStorage.setItem(
        "racing-cup-v1",
        JSON.stringify({
          version: 2,
          started: true,
          position: 2,
          coins: 15,
          journey: { version: 2, distance: 64, x: -2.6, pending: null },
        }),
      );
  });
  await page.goto("/");
  await page.locator("#continue").click();
  await page.locator("#warmup-all").click();
  await page.locator("#warmup-begin").click();
  for (let i = 0; i < 16; i++) {
    await expect(page.locator(".eyebrow")).toContainText(`${i + 1} ИЗ 16`);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.locator("#warmup-next").click();
  }
  await expect(page.locator("#gp-start")).toBeVisible();
  const s = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)),
    KEY,
  );
  expect(s.coins).toBe(15);
  expect(s.journey.x).toBe(-2.6);
});
test("Акварельные картинки локальные, выбор читается на телефоне", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "racing-cup-v1",
      JSON.stringify({ version: 2, started: true }),
    ),
  );
  await page.goto("/");
  await page.locator("#continue").click();
  await page
    .locator(".warmup-pick img")
    .evaluateAll((es) => Promise.all(es.map((e) => e.decode())));
  expect(await page.locator(".warmup-pick img").count()).toBe(16);
  await page.screenshot({
    path: "test-results/warmup-selection.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: "test-results/warmup-mobile.png",
    fullPage: true,
  });
  await page.locator("#warmup-skip").click();
  await expect(page.locator("#gp-start")).toBeVisible();
});

test("Таймер: автозапуск, пауза, продолжение и окончание без автоперехода", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#start").click();
  await page.locator("#go").click();
  await page.locator("#warmup-begin").click();
  const title = await page.locator("h1").textContent();
  await expect(page.locator("#warmup-timer-clock")).toHaveText("00:10");
  await expect(page.locator("#warmup-timer-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.clock.runFor(2300);
  await page.locator("#warmup-timer-toggle").click();
  const paused = await page.locator("#warmup-timer-clock").textContent();
  await page.clock.runFor(15000);
  await expect(page.locator("#warmup-timer-clock")).toHaveText(paused);
  await expect(page.locator("#warmup-timer-status")).toHaveText("Пауза");
  await page.locator("#warmup-timer-toggle").click();
  await page.clock.runFor(11000);
  await expect(page.locator("#warmup-timer-clock")).toHaveText("00:00");
  await expect(page.locator("#warmup-timer-status")).toHaveText("Готово");
  await expect(page.locator("h1")).toHaveText(title);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.locator("#warmup-timer-toggle").click();
  await page.clock.runFor(1000);
  await expect(page.locator("#warmup-timer-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#warmup-timer-reset").click();
  await expect(page.locator("#warmup-timer-clock")).toHaveText("00:10");
  await expect(page.locator("#warmup-timer-status")).toHaveText("");
  await expect(page.locator("#warmup-timer-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.clock.runFor(1100);
  await expect(page.locator("#warmup-timer-clock")).not.toHaveText("00:10");
});
test("Длительность сохраняется, новый таймер сбрасывается, старый останавливается при уходе", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator("#start").click();
  await page.locator("#go").click();
  await page.locator("#warmup-begin").click();
  await page.locator("#warmup-timer-duration").selectOption("15");
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).settings.warmupTimerDuration,
      KEY,
    ),
  ).toBe(15);
  await page.clock.runFor(2000);
  await page.locator("#warmup-next").click();
  await expect(page.locator("#warmup-timer-clock")).toHaveText("00:15");
  await expect(page.locator("#warmup-timer-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.clock.runFor(2000);
  await expect(page.locator("#warmup-timer-clock")).toHaveText("00:13");
  await expect(page.locator("#warmup-timer-status")).toHaveText("");
  await page.clock.runFor(1500);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const time = await page.locator("#warmup-timer-clock").textContent();
  await page.clock.runFor(20000);
  await expect(page.locator("#warmup-timer-clock")).toHaveText(time);
  await expect(page.locator("#warmup-timer-status")).toHaveText("Пауза");
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: "test-results/warmup-timer-mobile.png",
    fullPage: true,
  });
});
