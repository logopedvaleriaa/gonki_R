import { test, expect } from "@playwright/test";
test("Светофор: понятный старт, видимая машина, движение, остановка и финиш", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() => {
    Math.random = () => 0.9;
    localStorage.setItem(
      "racing-cup-v1",
      JSON.stringify({
        version: 2,
        settings: { speech: false, remoteLesson: true },
      }),
    );
  });
  await page.route("**/src/world.js*", async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      response: r,
      body: (await r.text()).replace(/renderer\.render\(scene,\s*camera\)/, ""),
    });
  });
  await page.goto("/");
  await page.locator("#free").click();
  await page.locator('[data-game="traffic"]').click();
  await expect(page.locator("#drive")).toBeDisabled();
  await page.clock.runFor(15000);
  await expect(page.locator("#red")).toHaveClass(/on/);
  await expect(page.locator("#traffic-status")).toContainText("Доезжай");
  await expect(page.locator(".material-toolbar")).toHaveCount(0);
  await page.locator("#traffic-start").click();
  await page.clock.runFor(3500);
  await expect(page.locator("#green")).toHaveClass(/on/);
  await page.locator("#drive").click();
  await page.clock.runFor(1000);
  const moved = parseFloat(
    await page.locator("#traffic-car").evaluate((e) => e.style.left),
  );
  expect(moved).toBeGreaterThan(0);
  await page.locator("#drive").click();
  const stopped = parseFloat(
    await page.locator("#traffic-car").evaluate((e) => e.style.left),
  );
  await page.clock.runFor(500);
  expect(
    parseFloat(
      await page.locator("#traffic-car").evaluate((e) => e.style.left),
    ),
  ).toBe(stopped);
  await page.locator("#traffic-pause").click();
  const status = await page.locator("#traffic-status").textContent();
  await page.clock.runFor(6000);
  await expect(page.locator("#traffic-status")).toHaveText(status);
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/traffic-mobile.png",
    fullPage: true,
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  for (let n = 0; n < 100; n++) {
    if (await page.getByRole("dialog").count()) break;
    const green = await page
      .locator("#green")
      .evaluate((e) => e.classList.contains("on"));
    const driving =
      (await page.locator("#drive").getAttribute("aria-pressed")) === "true";
    if (green !== driving) await page.locator("#drive").click();
    await page.clock.runFor(500);
  }
  await expect(page.getByRole("dialog")).toContainText("+10 монет");
});
