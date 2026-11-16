import { test, expect } from "@playwright/test";
test("Три вида гонок, пауза и облегчённый повтор", async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() =>
    localStorage.setItem(
      "racing-cup-v1",
      JSON.stringify({
        version: 2,
        settings: {
          speech: false,
          remoteLesson: false,
          adventureView: "board",
        },
      }),
    ),
  );
  await page.route("**/src/world.js*", async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      response: r,
      body: (await r.text()).replace(/renderer\.render\(scene,\s*camera\)/, ""),
    });
  });
  await page.goto("/");
  await page.locator("#free").click();
  for (const variant of ["delivery", "fuel", "cup"]) {
    await page.locator('[data-game="race"]').click();
    await page.locator(`[data-race="${variant}"]`).click();
    if (variant === "delivery") {
      await page.locator("#pause").click();
      const time = await page.locator("#race-time").textContent();
      await page.clock.runFor(5000);
      await expect(page.getByRole("dialog")).toContainText("Пауза");
      expect(await page.locator("#race-time").textContent()).toBe(time);
      await page.getByText("Продолжить", { exact: true }).click();
    }
    if (variant === "fuel") {
      await page.keyboard.down("ArrowLeft");
      await page.clock.runFor(800);
      await page.keyboard.up("ArrowLeft");
      await page.clock.runFor(50000);
      await expect(page.getByRole("dialog")).toContainText("Ещё один заезд");
      await page.getByText("Облегчённый режим", { exact: true }).click();
      await page.keyboard.down("ArrowRight");
      await page.clock.runFor(520);
      await page.keyboard.up("ArrowRight");
    }
    await page.keyboard.down("ArrowUp");
    await page.clock.runFor(48000);
    await page.keyboard.up("ArrowUp");
    await expect(page.getByRole("dialog")).toContainText("монет");
    await page.getByText("Выбрать мини-игру", { exact: true }).click();
  }
});
