// Deterministic connected road network. Loops offer alternate routes; walls never move.
export function createLabyrinth() {
  const size = 19,
    grid = Array.from({ length: size }, () => Array(size).fill(0));
  let seed = 49217;
  const random = () =>
    (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  const dirs = [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ];
  const carve = (x, y) => {
    grid[y][x] = 1;
    const order = [...dirs];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const [dx, dy] of order) {
      const nx = x + dx * 2,
        ny = y + dy * 2;
      if (nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && !grid[ny][nx]) {
        grid[y + dy][x + dx] = 1;
        carve(nx, ny);
      }
    }
  };
  carve(1, 1);
  // Extra junctions allow exploration without a single compulsory corridor.
  for (let y = 2; y < size - 2; y++)
    for (let x = 2; x < size - 2; x++)
      if (
        !grid[y][x] &&
        ((grid[y - 1][x] && grid[y + 1][x]) ||
          (grid[y][x - 1] && grid[y][x + 1])) &&
        random() < 0.13
      )
        grid[y][x] = 1;
  const key = (x, y) => `${x},${y}`;
  const distances = (start) => {
    const result = new Map([[key(...start), 0]]),
      q = [start];
    for (let i = 0; i < q.length; i++)
      for (const [dx, dy] of dirs) {
        const [x, y] = q[i],
          nx = x + dx,
          ny = y + dy,
          k = key(nx, ny);
        if (grid[ny]?.[nx] && !result.has(k)) {
          result.set(k, result.get(key(x, y)) + 1);
          q.push([nx, ny]);
        }
      }
    return result;
  };
  const cells = [];
  grid.forEach((row, y) =>
    row.forEach((open, x) => {
      if (open) cells.push([x, y]);
    }),
  );
  const fromStart = distances([1, 1]);
  const finish = cells.reduce((a, b) =>
    fromStart.get(key(...b)) > fromStart.get(key(...a)) ? b : a,
  );
  const chosen = [[1, 1], finish],
    sites = [];
  for (let n = 0; n < 14; n++) {
    const maps = chosen.map(distances);
    const next = cells
      .filter((c) => !chosen.some((s) => key(...s) === key(...c)))
      .reduce((best, c) => {
        const score = Math.min(...maps.map((m) => m.get(key(...c))));
        return !best || score > best.score ? { cell: c, score } : best;
      }, null).cell;
    sites.push(next);
    chosen.push(next);
  }
  sites.sort((a, b) => fromStart.get(key(...a)) - fromStart.get(key(...b)));
  const plan = [
    ["memory", "Мемори", 0, "checkpoint-5"],
    ["shadow", "Найди тень"],
    ["route", "Запомни картинки"],
    ["ttt", "Крестики-нолики", 1, "checkpoint-11"],
    ["detective", "Дорожный детектив"],
    ["traffic", "Светофор"],
    ["maze", "До заправки", 2, "checkpoint-17"],
    ["part", "Найди часть"],
    ["diff", "Найди отличия"],
    ["assembly", "Пит-стоп", 3, "checkpoint-23"],
    ["conveyor", "Конвейер"],
    ["guess", "Угадай картинку"],
    ["race", "Мини-гонка", 4, "checkpoint-29"],
    ["garage", "Гараж"],
  ];
  const stations = sites.map(([x, y], i) => ({
    x,
    y,
    game: plan[i][0],
    title: plan[i][1],
    checkpoint: plan[i][2] ?? null,
    id: plan[i][3] || `lab-${plan[i][0]}`,
  }));
  const reserved = new Set(chosen.map((c) => key(...c)));
  const mud = cells.filter(
    ([x, y]) => !reserved.has(key(x, y)) && (x * 7 + y * 11) % 17 === 0,
  );
  const coins = cells
    .filter(
      ([x, y]) =>
        !reserved.has(key(x, y)) &&
        !mud.some((c) => key(...c) === key(x, y)) &&
        (x * 3 + y * 5) % 7 === 0,
    )
    .map(([x, y]) => ({ x, y, id: `lab-coin-${x}-${y}` }));
  return { size, grid, stations, mud, coins, start: [1, 1], finish, distances };
}

export const OPTIONAL_POINTS = 20;
export function labyrinthBonus(state, stations = createLabyrinth().stations) {
  const completed = new Set(state.completed || []);
  return (
    stations.filter(
      (s) =>
        s.checkpoint === null && s.game !== "garage" && completed.has(s.id),
    ).length * OPTIONAL_POINTS
  );
}
