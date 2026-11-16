// A single readable activity at a time, separated by real driving stretches.
export const ROUTE_VERSION = 2;
export const STOP_SPACING = 144;
export const DRIVE_SPEED = 10;
export const REQUIRED = {
  5: "memory",
  11: "ttt",
  17: "maze",
  23: "assembly",
  29: "race",
};
export const TITLES = {
  memory: "Мемори",
  ttt: "Крестики-нолики",
  race: "Мини-гонка",
  maze: "Лабиринт",
  assembly: "Собери машину",
  route: "Запомни маршрут",
  diff: "Найди отличия",
  detective: "Дорожный детектив",
  conveyor: "Грузовой конвейер",
  traffic: "Светофор",
  guess: "Угадай картинку",
  garage: "Гараж",
  chest: "Сундук",
  surprise: "Сюрприз",
};
const PLAN = [
  [5, "memory"],
  [7, "route"],
  [9, "chest"],
  [11, "ttt"],
  [13, "detective"],
  [15, "traffic"],
  [17, "maze"],
  [19, "diff"],
  [21, "conveyor"],
  [23, "assembly"],
  [25, "guess"],
  [27, "garage"],
  [29, "race"],
];
export function journeyStops() {
  return PLAN.map(([index, game], n) => {
    const checkpoint = REQUIRED[index] ? Math.floor(index / 6) : null;
    return {
      index,
      id: checkpoint !== null ? `checkpoint-${index}` : `drive-${index}-0`,
      game,
      title: TITLES[game],
      distance: 64 + n * STOP_SPACING,
      x: checkpoint !== null ? 0 : [0, 2.6, -2.6][n % 3],
      checkpoint,
      branch: 0,
      fork: false,
    };
  });
}
export const FINISH_DISTANCE = 64 + (PLAN.length - 1) * STOP_SPACING + 72;
export function routeDistance(position) {
  const stops = [{ index: 0, distance: 0 }, ...journeyStops()];
  const p = Math.max(0, Math.min(29, Number(position) || 0));
  for (let i = 1; i < stops.length; i++) {
    if (p <= stops[i].index) {
      const a = stops[i - 1],
        b = stops[i];
      return (
        a.distance +
        ((p - a.index) / (b.index - a.index)) * (b.distance - a.distance)
      );
    }
  }
  return stops.at(-1).distance;
}
export function routePosition(distance) {
  const stops = [{ index: 0, distance: 0 }, ...journeyStops()];
  for (let i = 1; i < stops.length; i++) {
    if (distance <= stops[i].distance) {
      const a = stops[i - 1],
        b = stops[i];
      return Math.floor(
        a.index +
          ((distance - a.distance) / (b.distance - a.distance)) *
            (b.index - a.index),
      );
    }
  }
  return 29;
}
export function routeRegion(distance) {
  return Math.min(
    4,
    journeyStops().filter(
      (s) => s.checkpoint !== null && s.distance + 24 <= distance,
    ).length,
  );
}
export function journeyItems() {
  const items = [];
  const coin = (d, x, n) =>
    items.push({ id: `coin-${n}`, kind: "coin", distance: d, x, value: 1 });
  [16, 28, 40].forEach((d, n) => coin(d, 0, `start-${n}`));
  journeyStops().forEach((stop, n) => {
    if (stop.game === "chest")
      items.push({
        id: stop.id,
        kind: "chest",
        distance: stop.distance,
        x: 0,
        value: 5,
      });
    if (n === PLAN.length - 1) return;
    const lane = [0, 2.6, -2.6][n % 3];
    [32, 44, 56].forEach((d, k) => coin(stop.distance + d, lane, `${n}-${k}`));
    items.push({
      id: `cone-${n}`,
      kind: "cone",
      distance: stop.distance + 72,
      x:
        [0, 2.6, -2.6].find(
          (x) =>
            x !== lane &&
            (journeyStops()[n + 1].checkpoint !== null ||
              x !== journeyStops()[n + 1].x),
        ) ?? (lane === 0 ? 2.6 : 0),
    });
  });
  return items;
}
export function migrateJourney(state) {
  const stops = journeyStops();
  if (!state.journey)
    state.journey = {
      version: ROUTE_VERSION,
      distance: routeDistance(state.position),
      x: 0,
      pending: null,
    };
  const j = state.journey;
  if (j.version !== ROUTE_VERSION) {
    if (
      state.completed.includes("drive-1-0") &&
      !state.completed.includes("checkpoint-5")
    ) {
      state.completed.push("checkpoint-5");
      if (!state.cups.includes(0)) state.cups.push(0);
    }
    const p = Math.max(
      Number(state.position) || 0,
      (Number(j.distance) || 0) / 32,
    );
    j.distance = routeDistance(p);
    if (j.pending) {
      const next =
        stops.find((s) => s.index === j.pending.index) ||
        (j.pending.game === "memory" ? stops[0] : null);
      j.pending = next && !state.completed.includes(next.id) ? next : null;
    }
    j.version = ROUTE_VERSION;
  }
  j.distance = Math.max(0, Math.min(FINISH_DISTANCE, Number(j.distance) || 0));
  j.x = Math.max(-2.6, Math.min(2.6, Number(j.x) || 0));
  j.skipped ||= [];
  j.skipped = j.skipped.filter((id) =>
    stops.some((s) => s.id === id && s.checkpoint === null),
  );
  j.collected ||= [];
  j.hits ||= [];
  return j;
}
