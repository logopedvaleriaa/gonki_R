import { test, expect } from "@playwright/test";

test("Разметка и окружение остаются на трассе на всей дистанции", async ({
  page,
}) => {
  await page.route("**/src/world.js*", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /renderer\.render\(scene,\s*camera\)/,
        "window.__sceneProbe={setWorld,raceVisual,get:()=>({road,decor})}",
      ),
    });
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      "racing-cup-v1",
      JSON.stringify({
        version: 2,
        started: true,
        name: "Рома",
        settings: { speech: false, warmup: false },
      }),
    ),
  );
  await page.goto("/");
  await page.locator("#continue").click();
  await page.waitForFunction(() => !!window.__sceneProbe);
  for (const distance of [0, 180, 317, 700, 1400, 1800]) {
    const counts = await page.evaluate(async (distance) => {
      const world = window.__sceneProbe;
      world.setWorld("race");
      world.raceVisual(0, distance);
      const { road, decor } = world.get();
      return {
        stripes: road.children.filter(
          (o) =>
            o.geometry?.parameters?.width === 0.12 &&
            o.position.z >= -15 &&
            o.position.z < 109,
        ).length,
        scenery: decor.children.filter(
          (o) =>
            o.geometry?.parameters?.width !== 170 &&
            o.visible &&
            o.position.z > -12 &&
            o.position.z < 108,
        ).length,
      };
    }, distance);
    expect(counts.stripes, `Разметка на ${distance} м`).toBeGreaterThan(40);
    expect(counts.scenery, `Окружение на ${distance} м`).toBeGreaterThan(30);
  }
  await page.screenshot({ path: "test-results/restored-scenery.png" });
});
