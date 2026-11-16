import { test, expect } from "@playwright/test";
test("Стартовый экран и сенсорный интерфейс", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("canvas")).toBeVisible();
  await page.screenshot({ path: "test-results/home-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/home-mobile.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page
    .locator("#free")
    .tap({ force: true })
    .catch(() => page.locator("#free").click());
  await expect(page.locator('[data-game="dobble"]')).toBeVisible();
  await expect(page.locator("[data-game]")).toHaveCount(16);
});

test("Карточки с акварельными предметами на планшете и телефоне", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "racing-cup-v1",
      JSON.stringify({
        version: 2,
        settings: {
          speech: false,
          remoteLesson: false,
          adventureView: "board",
          captions: true,
        },
      }),
    ),
  );
  await page.goto("/");
  await page.locator("#free").click();
  await page.locator('[data-game="memory"]').click();
  const names = await page
    .locator(".memory-front img")
    .evaluateAll((es) => es.map((e) => e.alt));
  for (const word of [...new Set(names)].slice(0, 2)) {
    for (let i = 0; i < names.length; i++)
      if (names[i] === word) await page.locator(".card").nth(i).click();
    await page.waitForTimeout(400);
  }
  await page
    .locator(".memory-front img")
    .evaluateAll((es) => Promise.all(es.map((e) => e.decode())));
  await page.setViewportSize({ width: 1000, height: 950 });
  await page.screenshot({
    path: "test-results/memory-tablet.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({
    path: "test-results/memory-mobile.png",
    fullPage: true,
  });
});
