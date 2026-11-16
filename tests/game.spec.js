import { test, expect } from "@playwright/test";
import { solveMemoryGame } from "./helpers/memory.js";
import { WORDS } from "../src/speech.js";
const KEY = "racing-cup-v1";
test.beforeEach(async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    window.__skipDraw = true;
    if (!localStorage.getItem("racing-cup-v1"))
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
      );
  });
  await page.route("**/src/world.js*", async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      response: r,
      body: (await r.text()).replace(
        /renderer\.render\(scene,\s*camera\)/,
        "if(!window.__skipDraw)renderer.render(scene,camera)",
      ),
    });
  });
});
async function start(page) {
  await page.goto("/");
  await page.locator("#start").click();
  await page.locator("#name").fill("Миша");
  await page.locator("#go").click();
}
async function open(page, id) {
  console.log("Проверка:", id);
  await page.locator("#gp-library").click();
  await page.locator(`[data-game="${id}"]`).click();
}
async function reward(page) {
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog")).toContainText("монет");
  await page.getByText("Вернуться на карту", { exact: true }).click();
  await expect(page.locator("#gp-drive")).toBeVisible();
}
test("Полный цикл, пять обязательных игр и восстановление", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await start(page);
  await open(page, "memory");
  await solveMemoryGame(page);
  await reward(page);
  await open(page, "ttt");
  await page.locator("#duel-mode").selectOption("two");
  for (let r = 0; r < 3; r++) {
    for (const i of [0, 3, 1, 4, 2])
      await page.locator("#ttt button").nth(i).click();
    await page
      .getByText(r === 2 ? "Завершить дуэль" : "Следующий раунд", {
        exact: true,
      })
      .click();
  }
  await reward(page);
  await open(page, "maze");
  const rows = [
    "###########",
    "#...#.....#",
    "#.#.#.###.#",
    "#.#...#...#",
    "#.###.#.#.#",
    "#.....#.#.#",
    "###.###.#.#",
    "#...#...#.#",
    "#.###.###.#",
    "#.........#",
    "###########",
  ];
  let pos = [1, 1];
  for (const dest of [
    [9, 1],
    [1, 9],
    [7, 5],
    [9, 9],
  ]) {
    const q = [[pos]],
      seen = new Set([pos.join()]);
    let path;
    while (q.length) {
      let p = q.shift(),
        [x, y] = p.at(-1);
      if (x === dest[0] && y === dest[1]) {
        path = p;
        break;
      }
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        let n = [x + dx, y + dy];
        if (rows[n[1]]?.[n[0]] === "." && !seen.has(n.join())) {
          seen.add(n.join());
          q.push([...p, n]);
        }
      }
    }
    for (let i = 1; i < path.length; i++) {
      let dx = path[i][0] - path[i - 1][0],
        dy = path[i][1] - path[i - 1][1];
      await page.keyboard.press(
        dx === 1
          ? "ArrowRight"
          : dx === -1
            ? "ArrowLeft"
            : dy === 1
              ? "ArrowDown"
              : "ArrowUp",
      );
    }
    pos = dest;
  }
  await reward(page);
  await open(page, "assembly");
  for (let i = 0; i < 5; i++) {
    await page.locator(`[data-part="${i}"]`).click();
    await page.locator(`[data-slot="${i}"]`).click();
  }
  await reward(page);
  await open(page, "race");
  await page.locator('[data-race="delivery"]').click();
  await page.clock.runFor(48000);
  await reward(page);
  const coins = await page.evaluate(
    (k) => JSON.parse(localStorage.getItem(k)).coins,
    KEY,
  );
  expect(coins).toBeGreaterThanOrEqual(50);
  await page.reload();
  await page.locator("#continue").click();
  expect(
    await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).coins, KEY),
  ).toBe(coins);
  expect(errors).toEqual([]);
  await page.screenshot({ path: "test-results/map-desktop.png" });
});
test("Остальные игры завершаются и перезапускаются", async ({ page }) => {
  await start(page);
  await open(page, "diff");
  for (let i = 0; i < 5; i++)
    await page.locator(`[data-diff="${i}"]`).first().click();
  await reward(page);
  await open(page, "detective");
  for (let r = 0; r < 8; r++) {
    const n = ((r * 3 + 2) % 8) + 1;
    await page
      .locator(".detect-car")
      .filter({
        has: page.locator("b", { hasText: new RegExp("^" + n + "$") }),
      })
      .click();
  }
  await reward(page);
  await open(page, "conveyor");
  await page.locator("#belt-pause").click();
  while (await page.locator(".cargo").count()) {
    const b = page.locator(".cargo").first();
    const word = await b.getAttribute("data-word");
    await b.click();
    await page
      .locator(
        `[data-category="${WORDS.find((x) => x.word === word).position}"]`,
      )
      .click();
  }
  await reward(page);
  await open(page, "guess");
  for (let i = 0; i < 6; i++)
    await page.locator("#shutters button").nth(i).click();
  await page.locator("#guessed").click();
  await page.getByText("Дальше", { exact: true }).click();
  await reward(page);
  await open(page, "route");
  await page.evaluate(() => {
    window.routeSeen = [];
    new MutationObserver((records) => {
      for (const r of records) {
        if (
          r.target.classList.contains("lit") &&
          document
            .querySelector("#route-status")
            .textContent.startsWith("Запомни")
        )
          window.routeSeen.push(
            [...r.target.parentNode.children].indexOf(r.target),
          );
      }
    }).observe(document.querySelector("#landmarks"), {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  });
  await page.locator("#replay").waitFor({ state: "visible" });
  await expect(page.locator("#replay")).toBeEnabled();
  await page.evaluate(() => (window.routeSeen = []));
  await page.locator("#replay").click();
  for (let level = 3; level <= 5; level++) {
    await expect(page.locator("#route-status")).toHaveText(
      "Теперь твоя очередь!",
      { timeout: 10000 },
    );
    const seq = await page.evaluate((n) => window.routeSeen.slice(-n), level);
    expect(seq.length).toBe(level);
    for (const i of seq) await page.locator(".landmark").nth(i).click();
    if (level < 5)
      await expect(page.locator("#route-status")).toHaveText(
        "Запомни " +
          (level + 1) +
          (level + 1 === 5 ? " картинок" : " картинки"),
        { timeout: 4000 },
      );
  }
  await reward(page);
  // Keep the signal schedule deterministic while exercising the real controls.
  await page.evaluate(() => (Math.random = () => 0.9));
  await open(page, "traffic");
  await page.locator("#traffic-start").click();
  for (let i = 0; i < 900; i++) {
    const green = await page
      .locator("#green")
      .evaluate((e) => e.classList.contains("on"));
    if (green) await page.keyboard.down("Space");
    else await page.keyboard.up("Space");
    await page.clock.runFor(50);
    if (await page.getByRole("dialog").count()) break;
  }
  await page.keyboard.up("Space");
  await reward(page);
});
