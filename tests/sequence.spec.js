import { test, expect } from "@playwright/test";
import { WORDS } from "../src/speech.js";
test("Запомни картинки: акварельный твёрдый Р, 3–5 картинок, повтор и награда", async ({
  page,
}) => {
  await page.clock.install();
  await page.addInitScript(() =>
    localStorage.setItem(
      "racing-cup-v1",
      JSON.stringify({
        version: 2,
        settings: { speech: false, captions: true },
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
  await page.locator('[data-game="route"]').click();
  await expect(page.locator("h1")).toHaveText("Запомни картинки");
  await expect(page.locator("#route-status")).toHaveText("Запомни 3 картинки");
  const alts = await page
    .locator(".landmark img")
    .evaluateAll((es) => es.map((e) => e.alt));
  expect(new Set(alts).size).toBe(5);
  expect(alts.every((w) => WORDS.some((x) => x.word === w))).toBe(true);
  expect(
    await page
      .locator(".landmark img")
      .evaluateAll((es) => es.every((e) => e.src.includes("/watercolor/"))),
  ).toBe(true);
  await page.evaluate(() => {
    window.seen = [];
    new MutationObserver((rs) => {
      for (const r of rs) {
        if (
          r.target.matches(".landmark.lit") &&
          document
            .querySelector("#route-status")
            .textContent.startsWith("Запомни")
        )
          window.seen.push([...r.target.parentNode.children].indexOf(r.target));
      }
    }).observe(document.querySelector("#landmarks"), {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  });
  await page.clock.runFor(3400);
  let previous = [];
  for (let level = 3; level <= 5; level++) {
    await expect(page.locator("#route-status")).toHaveText(
      "Теперь твоя очередь!",
    );
    let seq = await page.evaluate((n) => window.seen.slice(-n), level);
    expect(seq.length).toBe(level);
    expect(seq.slice(0, previous.length)).toEqual(previous);
    await page.locator("#replay").click();
    await page.clock.runFor(level * 900 + 600);
    expect(await page.evaluate((n) => window.seen.slice(-n), level)).toEqual(
      seq,
    );
    if (level === 3) {
      await page
        .locator(".landmark")
        .nth((seq[0] + 1) % 5)
        .click();
      await page.clock.runFor(level * 900 + 600);
      await expect(page.locator("#route-progress")).toHaveText(
        "Повторено: 0 из 3",
      );
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: "test-results/sequence-mobile.png",
        fullPage: true,
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBe(390);
    }
    for (const i of seq) await page.locator(".landmark").nth(i).click();
    previous = seq;
    if (level < 5) {
      await page.clock.runFor(950);
      await expect(page.locator("#route-status")).toHaveText(
        `Запомни ${level + 1} ${level === 4 ? "картинок" : "картинки"}`,
      );
      await page.clock.runFor((level + 1) * 900 + 600);
    }
  }
  await page.clock.runFor(600);
  await expect(page.getByRole("dialog")).toContainText("+10 монет");
});
