import { test, expect } from "@playwright/test";
import { createLabyrinth, labyrinthBonus } from "../src/labyrinth.js";
import { solveMemoryGame } from "./helpers/memory.js";
const layout = createLabyrinth(),
  KEY = "racing-cup-v1";
const stored = (p) =>
  p.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
test("Лабиринт связный: все игры, финиш и замедления достижимы", () => {
  const distances = layout.distances(layout.start);
  for (const s of [...layout.stations, ...layout.coins])
    expect(distances.has(`${s.x},${s.y}`)).toBe(true);
  expect(distances.has(layout.finish.join(","))).toBe(true);
  expect(layout.stations).toHaveLength(14);
  expect(new Set(layout.stations.map((s) => `${s.x},${s.y}`)).size).toBe(14);
  expect(
    layout.stations
      .filter((s) => s.checkpoint !== null)
      .map((s) => s.checkpoint),
  ).toEqual([0, 1, 2, 3, 4]);
  expect(layout.mud.length).toBeGreaterThan(0);
  expect(layout.grid.flat().filter(Boolean).length).toBe(distances.size);
});
async function init(page, patch = {}) {
  await page.clock.install();
  await page.route("**/src/world.js*", async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      response: r,
      body: (await r.text()).replace(/renderer\.render\(scene,\s*camera\)/, ""),
    });
  });
  await page.addInitScript(
    ({ KEY, patch }) => {
      if (!localStorage.getItem(KEY))
        localStorage.setItem(
          KEY,
          JSON.stringify({
            version: 2,
            started: true,
            name: "Рома",
            settings: {
              warmup: false,
              speech: false,
              remoteLesson: true,
              adventureView: "maze",
            },
            ...patch,
          }),
        );
    },
    { KEY, patch },
  );
  await page.goto("/");
  await page.locator("#continue").click();
}
async function seed(page, patch) {
  await page.locator("#home").click();
  await page.evaluate(
    ({ KEY, patch }) => {
      const s = JSON.parse(localStorage.getItem(KEY));
      Object.assign(s, patch);
      localStorage.setItem(KEY, JSON.stringify(s));
    },
    { KEY, patch },
  );
  await page.reload();
  await page.locator("#continue").click();
}
function neighbor([x, y]) {
  return [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ]
    .map(([dx, dy]) => ({ x: x - dx, y: y - dy, dx, dy }))
    .find((p) => layout.grid[p.y]?.[p.x]);
}
test("Управление по четырём направлениям, стены, пауза и сохранение", async ({
  page,
}) => {
  await init(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(page.locator("#journey-go")).toHaveText("▶ Ехать");
  await page.clock.runFor(1000);
  expect((await stored(page)).labyrinth.x).toBe(1);
  await page.locator('[data-direction="-1,0"]').click();
  await page.clock.runFor(900);
  expect((await stored(page)).labyrinth.x).toBe(1);
  await expect(page.locator("#lab-notice")).toContainText("Поворот");
  const start = neighbor(layout.start);
  const dx = -start.dx,
    dy = -start.dy;
  await page.locator(`[data-direction="${dx},${dy}"]`).click();
  await page.clock.runFor(600);
  await page.locator("#lab-pause").click();
  const before = (await stored(page)).labyrinth;
  await page.clock.runFor(3000);
  expect((await stored(page)).labyrinth).toEqual(before);
  await page.reload();
  await page.locator("#continue").click();
  expect((await stored(page)).labyrinth).toEqual(before);
  expect(errors).toEqual([]);
});
test("Мемори в лабиринте: два раунда, награда один раз, возврат на место и ручной старт", async ({
  page,
}) => {
  const station = layout.stations.find((s) => s.game === "memory"),
    p = neighbor([station.x, station.y]);
  await init(page, { labyrinth: { ...p, collected: [] } });
  await page.locator("#journey-go").click();
  await page.clock.runFor(1700);
  await expect(page.locator("#cards")).toBeVisible();
  await solveMemoryGame(page);
  await expect(page.locator("#lab-map")).toBeVisible();
  let s = await stored(page);
  expect(s.cups).toEqual([0]);
  expect(s.coins).toBe(10);
  expect([s.labyrinth.x, s.labyrinth.y]).toEqual([station.x, station.y]);
  await expect(page.locator("#journey-go")).toHaveText("▶ Ехать");
  await page.clock.runFor(4000);
  expect((await stored(page)).labyrinth).toEqual(s.labyrinth);
  await page.reload();
  await page.locator("#continue").click();
  expect((await stored(page)).coins).toBe(10);
});
test("Новые игры: ошибки допускают повтор, пять заданий и одна награда", async ({
  page,
}) => {
  await init(page);
  for (const game of ["shadow", "part"]) {
    await page.locator("#lab-library").click();
    await page.locator(`[data-game="${game}"]`).click();
    for (let n = 0; n < (game === "part" ? 8 : 5); n++) {
      await page.locator('[data-answer="other"]').first().click();
      await expect(page.locator("#picture-feedback")).toContainText("ещё");
      await page.locator('[data-answer="correct"]').click();
      await page.clock.runFor(900);
    }
    await expect(page.getByRole("dialog")).toContainText("+10 монет");
    await page.getByText("Вернуться на карту", { exact: true }).click();
  }
  expect((await stored(page)).coins).toBe(20);
});
test("Финиш закрыт без кубка и открывается после пяти деталей", async ({
  page,
}) => {
  const p = neighbor(layout.finish);
  await init(page, { labyrinth: { ...p, collected: [] } });
  await page.locator("#journey-go").click();
  await page.clock.runFor(1700);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator("#lab-notice")).toContainText("осталось деталей");
  await seed(page, {
    cups: [0, 1, 2, 3, 4],
    labyrinth: { ...p, collected: [] },
  });
  await page.locator("#journey-go").click();
  await page.clock.runFor(1700);
  await expect(page.getByRole("dialog")).toContainText("Финиш лабиринта");
  await page.getByText("Ещё покататься", { exact: true }).click();
  await page.locator("#journey-go").click();
  await page.getByText("На чемпионский заезд", { exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Чемпионский заезд");
});
test("Замедление реально снижает скорость без штрафов", async ({ page }) => {
  const mud = layout.mud[0],
    p = neighbor(mud);
  await init(page, { labyrinth: { ...p, collected: [] }, coins: 8 });
  await page.locator("#journey-go").click();
  await page.clock.runFor(700);
  expect([
    (await stored(page)).labyrinth.x,
    (await stored(page)).labyrinth.y,
  ]).toEqual([p.x, p.y]);
  await page.clock.runFor(1000);
  await page.locator("#lab-pause").click();
  const s = await stored(page);
  expect([s.labyrinth.x, s.labyrinth.y]).toEqual(mud);
  expect(s.coins).toBeGreaterThanOrEqual(8);
});
test("Крестики-нолики: прямые ходы без речевых окон и передачи хода", async ({
  page,
}) => {
  await init(page);
  await page.locator("#lab-library").click();
  await page.locator('[data-game="ttt"]').click();
  for (let round = 0; round < 3; round++) {
    for (const i of [0, 3, 1, 4, 2]) {
      await page.locator("#ttt button").nth(i).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.locator("#ttt button").nth(i).locator(".duel-mark"),
      ).toHaveCount(1);
    }
    await expect(page.locator("#ttt .win")).toHaveCount(3);
    await page
      .getByText(round === 2 ? "Завершить дуэль" : "Следующий раунд", {
        exact: true,
      })
      .click();
  }
  await expect(page.getByRole("dialog")).toContainText("монет");
});
test("Вид лабиринта на компьютере и телефоне", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "racing-cup-v1",
      JSON.stringify({
        version: 2,
        started: true,
        settings: { warmup: false, speech: false, adventureView: "maze" },
      }),
    ),
  );
  await page.goto("/");
  await page.locator("#continue").click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "test-results/labyrinth-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: "test-results/labyrinth-mobile.png" });
});

async function solveMaze(page) {
  const cells = await page.locator("#maze>div").evaluateAll((es) =>
    es.map((e) => ({
      wall: e.classList.contains("wall"),
      text: e.textContent,
    })),
  );
  let position = cells.findIndex((c) => c.text === "🚗");
  const goals = cells
    .map((c, i) => (c.text === "🛢️" ? i : -1))
    .filter((i) => i >= 0);
  goals.push(cells.findIndex((c) => c.text === "⛽"));
  for (const goal of goals) {
    const q = [[position]],
      seen = new Set([position]);
    let path = [];
    while (q.length) {
      const p = q.shift(),
        i = p.at(-1);
      if (i === goal) {
        path = p;
        break;
      }
      for (const n of [i - 1, i + 1, i - 11, i + 11])
        if (n >= 0 && n < cells.length && !cells[n].wall && !seen.has(n)) {
          seen.add(n);
          q.push([...p, n]);
        }
    }
    expect(path.length).toBeGreaterThan(0);
    for (let k = 1; k < path.length; k++) {
      const d = path[k] - path[k - 1];
      await page.keyboard.press(
        d === 1
          ? "ArrowRight"
          : d === -1
            ? "ArrowLeft"
            : d === 11
              ? "ArrowDown"
              : "ArrowUp",
      );
    }
    position = goal;
  }
}
async function assemble(page) {
  for (let i = 0; i < 5; i++) {
    await page.locator(`[data-part="${i}"]`).click();
    await page.locator(`[data-slot="${i}"]`).click();
  }
  await page.clock.runFor(2000);
}

test("Пять обязательных игр в лабиринте и полный чемпионский финал", async ({
  page,
}) => {
  await init(page);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const station of layout.stations.filter((s) => s.checkpoint !== null)) {
    const p = neighbor([station.x, station.y]);
    await seed(page, { labyrinth: { ...p, collected: [] } });
    await page.locator("#journey-go").click();
    await page.clock.runFor(1700);
    if (station.game === "memory") await solveMemoryGame(page);
    if (station.game === "ttt") {
      for (let r = 0; r < 3; r++) {
        for (const i of [0, 3, 1, 4, 2])
          await page.locator("#ttt button").nth(i).click();
        await page
          .getByText(r === 2 ? "Завершить дуэль" : "Следующий раунд", {
            exact: true,
          })
          .click();
      }
    }
    if (station.game === "maze") await solveMaze(page);
    if (station.game === "assembly") await assemble(page);
    if (station.game === "race") {
      await page.locator('[data-race="delivery"]').click();
      await page.clock.runFor(48000);
    }
    await expect(page.locator("#lab-map")).toBeVisible();
    expect((await stored(page)).cups).toContain(station.checkpoint);
    await expect(page.locator("#journey-go")).toHaveText("▶ Ехать");
  }
  expect((await stored(page)).cups).toEqual([0, 1, 2, 3, 4]);
  await seed(page, {
    labyrinth: { ...neighbor(layout.finish), collected: [] },
  });
  await page.locator("#journey-go").click();
  await page.clock.runFor(1700);
  await page.getByText("На чемпионский заезд", { exact: true }).click();
  await page.getByText("На старт", { exact: true }).click();
  await page.clock.runFor(48000);
  await page.getByText("В мастерскую", { exact: true }).click();
  await assemble(page);
  await page.getByText("К финишу", { exact: true }).click();
  await page.clock.runFor(16000);
  await expect(page.locator("h1")).toContainText("кубок твой");
  expect((await stored(page)).wins).toBe(1);
  expect(errors).toEqual([]);
});

test("Бонусные очки только за дополнительные игры, без повторного начисления", () => {
  const optional = layout.stations.filter(
    (s) => s.checkpoint === null && s.game !== "garage",
  );
  const ids = optional.map((s) => s.id);
  expect(labyrinthBonus({ completed: [] })).toBe(0);
  expect(
    labyrinthBonus({
      completed: [ids[0], ids[0], "checkpoint-5", "lab-garage"],
    }),
  ).toBe(20);
  expect(labyrinthBonus({ completed: ids })).toBe(160);
});
test("Дополнительную игру можно проехать или выполнить за 20 очков", async ({
  page,
}) => {
  const station = layout.stations.find((s) => s.game === "shadow"),
    p = neighbor([station.x, station.y]);
  await init(page, { labyrinth: { ...p, collected: [] } });
  await page.locator("#journey-go").click();
  await page.clock.runFor(1700);
  await expect(page.getByRole("dialog")).toContainText("По желанию");
  await expect(page.getByRole("dialog")).toContainText("+20");
  await page.getByText("Проехать", { exact: true }).click();
  await page.clock.runFor(300);
  await page.locator("#lab-pause").click();
  expect((await stored(page)).completed || []).not.toContain(station.id);
  await seed(page, { labyrinth: { ...p, collected: [] } });
  await page.locator("#journey-go").click();
  await page.clock.runFor(1700);
  await page.getByRole("button", { name: "Играть", exact: true }).click();
  for (let n = 0; n < 5; n++) {
    await page.locator('[data-answer="correct"]').click();
    await page.clock.runFor(900);
  }
  await expect(page.locator("#lab-status")).toContainText("⭐ 20");
  await expect(page.locator("#lab-notice")).toContainText("+20 очков");
  await expect(page.locator("#journey-go")).toHaveText("▶ Ехать");
  const saved = await stored(page);
  expect(saved.completed).toContain(station.id);
  expect(saved.coins).toBe(10);
  await page.reload();
  await page.locator("#continue").click();
  await expect(page.locator("#lab-status")).toContainText("⭐ 20");
  expect((await stored(page)).coins).toBe(10);
});
