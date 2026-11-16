import { test, expect } from "@playwright/test";
async function start(page, remoteLesson) {
  await page.clock.install();
  await page.addInitScript(
    (remoteLesson) =>
      localStorage.setItem(
        "racing-cup-v1",
        JSON.stringify({
          version: 2,
          settings: { remoteLesson, speech: false },
        }),
      ),
    remoteLesson,
  );
  // Observe the actual camera projection, so reversed world axes cannot pass.
  await page.route("**/src/world.js*", async (route) => {
    const r = await route.fetch();
    await route.fulfill({
      response: r,
      body: (await r.text()).replace(
        /renderer\.render\(scene,\s*camera\)/,
        'camera.updateMatrixWorld();window.__screenCarX=mode==="race"&&car?car.position.clone().project(camera).x:null',
      ),
    });
  });
  await page.goto("/");
  await page.locator("#free").click();
  await page.locator('[data-game="race"]').click();
  await page.locator('[data-race="delivery"]').click();
  await page.clock.runFor(50);
}
const x = (page) => page.evaluate(() => window.__screenCarX);
test("Экранные стрелки Zoom соответствуют направлению машины", async ({
  page,
}) => {
  await start(page, true);
  const center = await x(page);
  await page.locator('[data-key="ArrowLeft"]').click();
  await page.clock.runFor(50);
  expect(await x(page)).toBeLessThan(center);
  await page.locator('[data-key="ArrowRight"]').click();
  await page.clock.runFor(50);
  expect(await x(page)).toBeCloseTo(center, 4);
  await page.locator('[data-key="ArrowRight"]').click();
  await page.clock.runFor(50);
  expect(await x(page)).toBeGreaterThan(center);
});
test("Стрелки клавиатуры, A/D и удержание мышью соответствуют экрану", async ({
  page,
}) => {
  await start(page, false);
  const center = await x(page);
  for (const [left, right] of [
    ["ArrowLeft", "ArrowRight"],
    ["a", "d"],
  ]) {
    await page.keyboard.down(left);
    await page.clock.runFor(400);
    await page.keyboard.up(left);
    expect(await x(page)).toBeLessThan(center);
    await page.keyboard.down(right);
    await page.clock.runFor(800);
    await page.keyboard.up(right);
    expect(await x(page)).toBeGreaterThan(center);
    await page.keyboard.down(left);
    await page.clock.runFor(400);
    await page.keyboard.up(left);
  }
  const before = await x(page);
  const b = await page.locator('[data-key="ArrowLeft"]').boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.clock.runFor(400);
  await page.mouse.up();
  expect(await x(page)).toBeLessThan(before);
});
test.describe("Касания", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("Левая сенсорная кнопка перемещает машину влево", async ({ page }) => {
    await start(page, false);
    const center = await x(page),
      b = await page.locator('[data-key="ArrowLeft"]').boundingBox();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }],
    });
    await page.clock.runFor(400);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    expect(await x(page)).toBeLessThan(center);
  });
});
