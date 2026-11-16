import { test, expect } from "@playwright/test";
test("Диагностика загрузки и игровой карты", async ({ page }) => {
  page.on("pageerror", (e) => console.log("ERROR", e.message));
  await page.addInitScript(() =>
    localStorage.setItem(
      "racing-cup-v1",
      JSON.stringify({
        version: 2,
        settings: {
          speech: false,
          warmup: false,
          remoteLesson: false,
          adventureView: "board",
        },
      }),
    ),
  );
  await page.goto("/");
  await page.locator("#start").click();
  await page.locator("#go").click();
  await expect(page.locator("#gp-drive")).toBeVisible();
  await page.locator("#gp-library").click();
  await page.locator('[data-game="assembly"]').click();
  for (let i = 0; i < 5; i++) {
    await page.locator(`[data-part="${i}"]`).click();
    await page.locator(`[data-slot="${i}"]`).click();
  }
  await expect(page.getByRole("dialog")).toContainText("монет", {
    timeout: 5000,
  });
});
