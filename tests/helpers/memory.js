import { expect } from "@playwright/test";
export async function solveMemoryRound(page) {
  const names = await page
    .locator(".memory-front img")
    .evaluateAll((es) => es.map((e) => e.alt));
  for (const word of new Set(names))
    for (let i = 0; i < names.length; i++)
      if (names[i] === word) await page.locator(".card").nth(i).click();
  await page.clock.runFor(650);
}
export async function solveMemoryGame(page) {
  for (let round = 0; round < 2; round++) {
    await expect(page.locator(".card")).toHaveCount([10, 20][round]);
    await solveMemoryRound(page);
    if (round < 1) await page.locator("#memory-next-round").click();
  }
}
