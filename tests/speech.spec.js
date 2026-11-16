import { solveMemoryGame } from "./helpers/memory.js";
import { test, expect } from "@playwright/test";
import { WORDS, PHRASES, material, conveyorMaterial } from "../src/speech.js";
async function next(page) {
  for (let i = 0; i < 5; i++) {
    const b = page
      .getByRole("dialog")
      .getByRole("button", { name: "Дальше", exact: true });
    if (!(await b.count())) break;
    await b.click();
  }
}
async function freeGame(page, id) {
  await page.goto("/");
  await page.locator("#free").click();
  await page.locator(`[data-game="${id}"]`).click();
  await next(page);
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("racing-cup-v1"))
      localStorage.setItem(
        "racing-cup-v1",
        JSON.stringify({
          version: 2,
          settings: {
            warmup: false,
            remoteLesson: false,
            adventureView: "board",
          },
        }),
      );
  });
  await page.clock.install();
  await page.route("**/src/world.js*", async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      response: r,
      body: (await r.text()).replace(/renderer\.render\(scene,\s*camera\)/, ""),
    });
  });
});
test("Проверенный словарь и все локальные изображения", async ({ page }) => {
  expect(WORDS).toHaveLength(17);
  expect(PHRASES.map((x) => x.word)).toEqual([
    "красный шар",
    "огромный самовар",
    "красный помидор",
    "горный баран",
    "большой краб",
    "новый трактор",
    "высокая гора",
    "сладкая груша",
  ]);
  expect(WORDS.every((x) => !/р[еёиюяь]/i.test(x.word))).toBe(true);
  expect(
    conveyorMaterial({
      conveyorWords:
        "река|начало\nтрактор|середина\nкран|начало\nкорова|середина",
    }).map((x) => x.word),
  ).toEqual(["корова"]);
  expect(
    material({
      material: "words",
      speechGroup: "все",
      words: "река\nприрода\nшар",
    }).map((x) => x.word),
  ).toEqual(["шар"]);
  await page.goto("/");
  for (const x of WORDS) {
    const r = await page.request.get("/images/watercolor/" + x.id + ".png");
    expect(r.ok(), x.word).toBe(true);
    expect(r.headers()["content-type"]).toContain("image");
  }
  await page.locator("#settings").click();
  await page.locator(".settings-catalog summary").click();
  await page
    .locator(".catalog-item img")
    .evaluateAll((es) => Promise.all(es.map((e) => e.decode())));
  expect(await page.locator(".catalog-item img").count()).toBe(25);
  await page.screenshot({
    path: "test-results/watercolor-catalog.png",
    fullPage: true,
  });
});
test("Стандартное Мемори без подтверждений, подписи и смена материала", async ({
  page,
}) => {
  await freeGame(page, "memory");
  await expect(page.locator(".memory-front img")).toHaveCount(10);
  await expect(page.locator(".object-caption").first()).toBeHidden();
  await page.locator("#picture-captions").check();
  await expect(page.locator(".object-caption").first()).toBeVisible();
  await page.locator('[data-material="phrases"]').click();
  await next(page);
  await solveMemoryGame(page);
  await expect(page.getByRole("dialog")).toContainText("монет");
  await page.getByText("Выбрать мини-игру", { exact: true }).click();
  await page.locator('[data-game="memory"]').click();
  await next(page);
  await expect(page.locator(".matched")).toHaveCount(0);
});
test("Дуэль: картинки и немедленные ходы без подтверждений", async ({
  page,
}) => {
  await freeGame(page, "ttt");
  await page.locator("#duel-mode").selectOption("two");
  await expect(page.locator("#ttt img")).toHaveCount(9);
  for (let r = 0; r < 3; r++) {
    for (const i of [0, 3, 1, 4, 2]) {
      await page.locator("#ttt button").nth(i).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.locator("#ttt button").nth(i).locator(".duel-mark"),
      ).toHaveCount(1);
    }
    await page
      .getByText(r === 2 ? "Завершить дуэль" : "Следующий раунд", {
        exact: true,
      })
      .click();
  }
  await expect(page.getByRole("dialog")).toContainText("монет");
});
test("Речевой конвейер и скрытая картинка", async ({ page }) => {
  await freeGame(page, "conveyor");
  await page.locator("#belt-pause").click();
  while (await page.locator(".cargo").count()) {
    const b = page.locator(".cargo").first(),
      word = await b.getAttribute("data-word");
    await b.click();
    await expect(page.getByRole("dialog")).toContainText("Речевой груз");
    await next(page);
    await page
      .locator(
        `[data-category="${WORDS.find((x) => x.word === word).position}"]`,
      )
      .click();
  }
  await expect(page.getByRole("dialog")).toContainText("монет");
  await page.getByText("Выбрать мини-игру", { exact: true }).click();
  await page.locator('[data-game="guess"]').click();
  await next(page);
  await expect(page.locator("#secret img")).toHaveCount(1);
  for (let i = 0; i < 6; i++)
    await page.locator("#shutters button").nth(i).click();
  await page.locator("#guessed").click();
  await next(page);
  await expect(page.getByRole("dialog")).toContainText("монет");
});
test("Гонка полностью замирает на речевых остановках", async ({ page }) => {
  await freeGame(page, "race");
  await page.locator('[data-race="delivery"]').click();
  await expect(page.getByRole("dialog")).toContainText("Перед стартом");
  await next(page);
  await page.keyboard.down("ArrowUp");
  await page.clock.runFor(20000);
  await expect(page.getByRole("dialog")).toContainText("Речевой пит-стоп");
  const t = await page.locator("#race-time").textContent(),
    goal = await page.locator("#race-goal").textContent();
  await page.keyboard.down("ArrowRight");
  await page.clock.runFor(10000);
  expect(await page.locator("#race-time").textContent()).toBe(t);
  expect(await page.locator("#race-goal").textContent()).toBe(goal);
  await page.keyboard.up("ArrowRight");
  await next(page);
  await page.keyboard.down("ArrowUp");
  await page.clock.runFor(30000);
  await expect(page.getByRole("dialog")).toContainText("После финиша");
  await next(page);
  await expect(page.getByRole("dialog")).toContainText("монет");
});

test("Старые монеты и детали сохраняются при переходе к гонкам", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "racing-cup-v1",
      JSON.stringify({
        version: 2,
        started: true,
        coins: 37,
        cups: [0, 1],
        settings: { warmup: false, speech: false, adventureView: "board" },
      }),
    ),
  );
  await page.goto("/");
  await page.locator("#continue").click();
  await expect(page.locator("#gp-start")).toBeVisible();
  const s = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("racing-cup-v1")),
  );
  expect(s.coins).toBe(37);
  expect(s.cups).toEqual([0, 1]);
});

test.describe("Сенсорное управление", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("Сборка и лабиринт касаниями", async ({ page }) => {
    await freeGame(page, "assembly");
    for (let i = 0; i < 5; i++) {
      await page.locator(`[data-part="${i}"]`).tap();
      await page.locator(`[data-slot="${i}"]`).tap();
    }
    await page.clock.runFor(2000);
    await expect(page.getByRole("dialog")).toContainText("монет");
    await page.getByText("Выбрать мини-игру", { exact: true }).tap();
    await page.locator('[data-game="maze"]').tap();
    await next(page);
    const before = await page.locator("#maze").textContent();
    await page.locator('[data-dir="1,0"]').tap();
    const carCell = await page
      .locator("#maze>div")
      .evaluateAll((es) => es.findIndex((e) => e.textContent === "🚗"));
    expect(carCell).toBe(13);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
  });
});
