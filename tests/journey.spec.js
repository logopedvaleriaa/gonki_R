import { test, expect } from "@playwright/test";
import {
  journeyStops,
  journeyItems,
  REQUIRED,
  STOP_SPACING,
  DRIVE_SPEED,
  FINISH_DISTANCE,
  ROUTE_VERSION,
  migrateJourney,
} from "../src/journey.js";
test("Маршрут: одна задача за раз, все мини-игры и безопасные интервалы", () => {
  const stops = journeyStops(),
    items = journeyItems();
  expect(stops.filter((s) => s.game === "memory")).toHaveLength(1);
  expect(new Set(stops.map((s) => s.distance)).size).toBe(stops.length);
  expect(
    new Set(
      stops
        .filter((s) => !["garage", "chest"].includes(s.game))
        .map((s) => s.game),
    ).size,
  ).toBe(11);
  for (let i = 1; i < stops.length; i++)
    expect(stops[i].distance - stops[i - 1].distance).toBeGreaterThanOrEqual(
      STOP_SPACING,
    );
  expect(STOP_SPACING / DRIVE_SPEED).toBeGreaterThanOrEqual(12);
  for (const [p, g] of Object.entries(REQUIRED))
    expect(stops.find((s) => s.index === +p).game).toBe(g);
  expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  for (const item of items.filter((i) => i.kind !== "chest"))
    for (const stop of stops)
      expect(Math.abs(item.distance - stop.distance)).toBeGreaterThanOrEqual(
        24,
      );
  for (const item of items.filter((i) => i.kind === "cone")) {
    const next = stops.find((s) => s.distance > item.distance);
    expect(next.distance - item.distance).toBeGreaterThanOrEqual(70);
  }
});
test("Старое сохранение переносится без повторного Мемори и потери монет", () => {
  const s = {
    position: 1,
    coins: 23,
    cups: [],
    completed: ["drive-1-0"],
    journey: { distance: 35, x: 0, pending: null },
  };
  migrateJourney(s);
  expect(s.coins).toBe(23);
  expect(s.cups).toEqual([0]);
  expect(s.completed).toContain("checkpoint-5");
  expect(s.journey.version).toBe(ROUTE_VERSION);
  const d = s.journey.distance;
  migrateJourney(s);
  expect(s.journey.distance).toBe(d);
  expect(s.cups).toEqual([0]);
});
