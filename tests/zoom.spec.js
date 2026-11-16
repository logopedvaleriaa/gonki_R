import { test, expect } from "@playwright/test";
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
async function confirm(page) {
  await expect(page.getByRole("dialog")).toContainText("Логопед");
  const named = page.getByRole("button", { name: "Я назвал", exact: true });
  if (await named.count()) await named.click();
  await page.getByRole("button", { name: "Дальше", exact: true }).click();
}
async function open(page, id) {
  await page.goto("/");
  await page.locator("#free").click();
  await page.locator(`[data-game="${id}"]`).click();
  if (id !== "ttt") await confirm(page);
}
test("Ученик против логопеда: прямые ходы, имена и три раунда", async ({
  page,
}) => {
  await open(page, "ttt");
  await expect(page.locator("#duel-mode")).toHaveValue("two");
  await page.locator("#student-name").fill("Рома");
  await page.locator("#teacher-name").fill("Анна");
  await page.locator("#teacher-name").blur();
  for (let round = 0; round < 3; round++) {
    for (const [j, i] of [0, 3, 1, 4, 2].entries()) {
      await page.locator("#ttt button").nth(i).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.locator("#ttt button").nth(i).locator(".duel-mark"),
      ).toHaveCount(1);
      if (j < 4)
        await expect(page.locator("#score")).toContainText(
          j % 2 === 0 ? "Ход: Анна" : "Ход: Рома",
        );
    }
    await page
      .getByText(round === 2 ? "Завершить дуэль" : "Следующий раунд", {
        exact: true,
      })
      .click();
  }
  await expect(page.getByRole("dialog")).toContainText("монет");
});
test("Гонка управляется отдельными щелчками без удержания", async ({
  page,
}) => {
  await open(page, "race");
  await page.locator('[data-race="delivery"]').click();
  await confirm(page);
  await page.locator('[data-key="ArrowUp"]').click();
  await expect(page.locator('[data-key="ArrowUp"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator('[data-key="ArrowUp"]').click();
  await expect(page.locator('[data-key="ArrowUp"]')).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.locator('[data-key="ArrowLeft"]').click();
  await page.locator('[data-key="ArrowRight"]').click();
  await page.locator('[data-key="ArrowUp"]').click();
  await page.clock.runFor(22000);
  await expect(page.getByRole("dialog")).toContainText("Речевой пит-стоп");
  const t = await page.locator("#race-time").textContent();
  await page.clock.runFor(10000);
  expect(await page.locator("#race-time").textContent()).toBe(t);
  await confirm(page);
  await page.locator('[data-key="ArrowUp"]').click();
  await page.clock.runFor(35000);
  await expect(page.getByRole("dialog")).toContainText("После финиша");
  await confirm(page);
  await expect(page.getByRole("dialog")).toContainText("монет");
});
test("Светофор: щелчок включает движение, следующий останавливает", async ({
  page,
}) => {
  await open(page, "traffic");
  await page.locator("#traffic-start").click();
  await expect(page.locator("#drive")).toHaveText("▶ Ехать");
  await page.locator("#drive").click();
  await page.clock.runFor(50);
  await expect(page.locator("#drive")).toHaveText("■ Остановиться");
  await page.locator("#drive").click();
  await page.clock.runFor(50);
  await expect(page.locator("#drive")).toHaveText("▶ Ехать");
  await page.locator("#lesson").click();
  await page.getByText("Выключить режим", { exact: true }).click();
  await page.reload();
  await expect(page.locator("#lesson")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
});
