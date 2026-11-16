import { test, expect } from "@playwright/test";
import { memoryPictures, MEMORY_ROUNDS } from "../src/memory.js";
import { solveMemoryRound } from "./helpers/memory.js";
test("Мемори: 5 и 10 пар, без подтверждений, одна награда за два раунда", async ({
  page,
}) => {
  await page.clock.install();
  await page.route("**/src/world.js*", async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      response: r,
      body: (await r.text()).replace(/renderer\.render\(scene,\s*camera\)/, ""),
    });
  });
  await page.goto("/");
  await page.locator("#free").click();
  await page.locator('[data-game="memory"]').click();
  for (const [round, pairs] of MEMORY_ROUNDS.entries()) {
    await expect(page.locator("#memory-round")).toHaveText(
      `Раунд ${round + 1} из 2 · ${pairs} пар`,
    );
    await expect(page.locator(".card")).toHaveCount(pairs * 2);
    await expect(page.locator(".matched")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const names = await page
      .locator(".memory-front img")
      .evaluateAll((es) => es.map((e) => e.alt));
    expect(new Set(names).size).toBe(pairs);
    const a = 0,
      b = names.findIndex((w) => w !== names[a]),
      third = names.findIndex((_, i) => i !== a && i !== b);
    await page.locator(".card").nth(a).click();
    await page.locator(".card").nth(b).click();
    await page.locator(".card").nth(third).click();
    await expect(page.locator(".card.open")).toHaveCount(2);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.clock.runFor(1000);
    await expect(page.locator(".card.open")).toHaveCount(0);
    await solveMemoryRound(page);
    if (round < 1) {
      await expect(page.locator("#memory-round-end")).toBeVisible();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      expect(
        await page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("racing-cup-v1") || "{}").coins ||
            0,
        ),
      ).toBe(0);
      await page.locator("#memory-next-round").click();
    }
  }
  await expect(page.getByRole("dialog")).toContainText("+10 монет");
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("racing-cup-v1")).coins,
    ),
  ).toBe(10);
  await page.getByText("Выбрать мини-игру", { exact: true }).click();
  await page.locator('[data-game="memory"]').click();
  await expect(page.locator("#memory-round")).toContainText("Раунд 1");
  await expect(page.locator(".matched")).toHaveCount(0);
});
test("В словосочетаниях и коротком списке 10 разных картинок, только твёрдый Р", () => {
  for (const settings of [
    { material: "phrases", speechGroup: "все", words: "" },
    { material: "words", speechGroup: "начало", words: "рак" },
  ]) {
    const items = memoryPictures(settings, 10);
    expect(items).toHaveLength(10);
    expect(new Set(items.map((x) => x.id)).size).toBe(10);
    expect(items.every((x) => !!x.word && !/р[еёиюяь]/i.test(x.word))).toBe(
      true,
    );
  }
});
