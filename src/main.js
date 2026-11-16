import "./style.css";
import * as W from "./world.js";
import { stepDriving } from "./driving.js";
import { stepRivals } from "./rivals.js";
import { createFreeChase, stepFreeChase } from "./free-chase.js";
import { oddRounds, missingRound, fragmentChoices } from "./extra-games.js";
import {paintFragment} from "./fragment.js";
import { RACE_ACTIVITIES, activitiesForRun } from "./race-activities.js";
import { dobbleRounds, dobbleLayout } from "./dobble.js";
import {
  createLabyrinth,
  labyrinthBonus,
  OPTIONAL_POINTS,
} from "./labyrinth.js";
import { MEMORY_ROUNDS, memoryPictures } from "./memory.js";
import { EXERCISES, warmupImage } from "./warmup.js";
import { routeRegion } from "./journey.js";
import {
  WORDS,
  PHRASES,
  GROUPS,
  TASKS,
  shuffled,
  material,
  conveyorMaterial,
  photo,
} from "./speech.js";
const $ = (s) => document.querySelector(s),
  app = $("#app");
const KEY = "racing-cup-v1";
const defaults = () => ({
  version: 2,
  started: false,
  name: "Гонщик",
  car: 0,
  color: "#ecad39",
  position: 0,
  journey: null,
  coins: 0,
  cups: [],
  completed: [],
  decor: [],
  style: {},
  wins: 0,
  roaming: false,
  stickers: [],
  settings: {
    sound: true,
    warmup: true,
    warmupTimerDuration: 10,
    remoteLesson: true,
    adventureView: "drive",
    difficulty: "normal",
    timers: true,
    duration: 45,
    speech: true,
    material: "words",
    captions: false,
    speechGroup: "все",
    catalogVersion: 1,
    soundTarget: "Р",
    words: "",
    speechType: 0,
    conveyorWords: "",
  },
});
let state;
try {
  state = { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || "null") };
  state.settings = { ...defaults().settings, ...state.settings };
} catch {
  state = defaults();
}
// Apply the requested ten-second starting duration to existing saved settings too.
if (state.settings.warmupTimerPreset !== "10s") {
  state.settings.warmupTimerDuration = 10;
  state.settings.warmupTimerPreset = "10s";
  save();
}
if (state.version < 2) {
  state.version = 2;
  state.settings = {
    ...state.settings,
    speech: true,
    soundTarget: "Р",
    material: "words",
    captions: false,
    speechGroup: "все",
    catalogVersion: 1,
    words: "",
    conveyorWords: "",
  };
  save();
}
let screen = "home",
  cleanup = () => {},
  pending = null,
  context = null,
  modalClose = null,
  busy = false,
  free = false,
  finalStage = 0,
  gameGeneration = 0;
const regions = [
  "Городской автодром",
  "Пустынная трасса",
  "Лесное ралли",
  "Неоновый город",
  "Чемпионский стадион",
];
const games = [
  ["memory", "🃏", "Найди пару в гараже", "Открывай и запоминай"],
  ["ttt", "🏁", "Крестики-нолики", "Три раунда на победу"],
  ["race", "🏎️", "Мини-гонки", "За руль — и вперёд!"],
  ["maze", "⛽", "Доберись до заправки", "Найди путь и топливо"],
  ["assembly", "🔧", "Пит-стоп", "Собери свой автомобиль"],
  ["route", "🖼️", "Запомни картинки", "Назови и повтори порядок"],
  ["diff", "🔎", "Найди отличия", "Пять маленьких секретов"],
  ["detective", "🚙", "Дорожный детектив", "Найди нужную машинку"],
  ["conveyor", "🚚", "Грузовой конвейер", "Разложи всё по местам"],
  ["traffic", "🚦", "Светофор", "Смотри, слушай, двигайся"],
  ["guess", "🚪", "Что в гараже?", "Открой секретную картинку"],
  ["odd", "◈", "Четвёртый лишний", "Найди лишнюю картинку"],
  ["missing", "?", "Что пропало?", "Найди пропавшую картинку"],
  ["shadow", "◐", "Найди тень", "Сравни силуэты"],
  ["part", "◩", "Найди часть", "Узнай предмет по фрагменту"],
  ["dobble", "◎", "Доббль", "Найди общий предмет"],
];
const mandatory = {
  5: "memory",
  11: "ttt",
  17: "maze",
  23: "assembly",
  29: "race",
};
const cellGames = [
  "route",
  "memory",
  "race",
  "detective",
  "guess",
  "memory",
  "diff",
  "conveyor",
  "race",
  "traffic",
  "route",
  "ttt",
  "race",
  "detective",
  "guess",
  "diff",
  "conveyor",
  "maze",
  "traffic",
  "route",
  "memory",
  "race",
  "guess",
  "assembly",
  "detective",
  "diff",
  "conveyor",
  "traffic",
  "route",
  "race",
];
const colors = [
  "#ecad39",
  "#df7258",
  "#6a9dc8",
  "#7caa75",
  "#a18aca",
  "#efe5c7",
];
function esc(s) {
  return String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    toast("Хранилище недоступно: не закрывайте вкладку до конца занятия.");
  }
}
function sound(freq = 520) {
  if (!state.settings.sound) return;
  try {
    const a = sound.ctx || (sound.ctx = new AudioContext());
    a.resume();
    const o = a.createOscillator(),
      g = a.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.06, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.16);
    o.connect(g).connect(a.destination);
    o.start();
    o.stop(a.currentTime + 0.17);
  } catch {}
}
function toast(t) {
  $(".toast")?.remove();
  let e = document.createElement("div");
  e.className = "toast";
  e.textContent = t;
  document.body.append(e);
  setTimeout(() => e.remove(), 2600);
}
function btn(text, fn, cls = "primary") {
  const b = document.createElement("button");
  b.className = cls;
  b.textContent = text;
  b.onclick = () => {
    sound();
    fn();
  };
  return b;
}
function header() {
  return `<header class="top"><div class="brand"><i>⚑</i> Гоночный кубок</div><nav class="nav">${state.started ? `<span class="pill">🪙 ${state.coins}</span><span class="pill">🏆 ${state.raceBest || 0} очков</span>` : ""}<button class="icon lesson-toggle" id="lesson" aria-label="Занятие вдвоём через Zoom" aria-pressed="${state.settings.remoteLesson}">👥</button><button class="icon" id="audio" aria-label="Переключить звук">${state.settings.sound ? "♪" : "♫̸"}</button><button class="icon" id="settings" aria-label="Настройки педагога">⚙</button><button class="icon" id="home" aria-label="Главное меню">⌂</button></nav></header>`;
}
function base(next, html, world = "map") {
  cleanup();
  cleanup = () => {};
  W.frame(() => {});
  W.rivalsCleanup();
  screen = next;
  document.body.dataset.screen = next;
  gameGeneration++;
  document.querySelector(".modal-shade")?.remove();
  modalClose = null;
  app.innerHTML = header() + html;
  $("#audio").onclick = () => {
    state.settings.sound = !state.settings.sound;
    save();
    $("#audio").textContent = state.settings.sound ? "♪" : "♫̸";
    sound();
  };
  document.body.classList.toggle("remote-lesson", state.settings.remoteLesson);
  $("#lesson").onclick = () =>
    modal(
      "Ученик против логопеда",
      `<p>Передайте ученику управление окном игры в Zoom.</p><p>В гонке: удерживать ↑ / W — газ, ← → / A D — руль, ↓ / S — тормоз.</p><p>В крестиках-ноликах ученик играет крестиком, логопед — ноликом. Ходы выполняются сразу, без подтверждений.</p><p>В «Светофоре» кнопка переключает «Ехать / Остановиться».</p>`,
      [
        [
          state.settings.remoteLesson ? "Выключить режим" : "Включить режим",
          () => {
            state.settings.remoteLesson = !state.settings.remoteLesson;
            save();
            document.body.classList.toggle(
              "remote-lesson",
              state.settings.remoteLesson,
            );
            $("#lesson").setAttribute(
              "aria-pressed",
              state.settings.remoteLesson,
            );
            toast("Режим изменён. Новая дуэль использует выбранный режим.");
          },
        ],
        ["Продолжить", () => {}, "secondary"],
      ],
    );
  $("#settings").onclick = settings;
  $("#home").onclick = home;
  W.setWorld(
    world,
    state.color,
    state.car,
    state.position,
    next === "adventure"
      ? routeRegion(state.journey?.distance || 0)
      : Math.min(4, Math.floor(state.position / 6)),
    state.style,
  );
}
function page(title, sub = "", extra = "") {
  base(
    "game",
    `<main class="screen panel"><div class="screen-head"><div><span class="eyebrow">ФЕСТИВАЛЬ • МИНИ-ИГРА</span><h1>${title}</h1><div class="muted">${sub}</div></div><button class="secondary small" id="back">${state.started && state.settings.adventureView !== "board" ? "К машине ↗" : "На карту ↗"}</button></div><div id="game">${extra}</div></main>`,
  );
  $("#back").onclick = returnMap;
  materialControls();
}
function modal(title, body, buttons) {
  const layer = document.createElement("div");
  layer.className = "modal-shade";
  layer.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2>${title}</h2><div>${body}</div><div class="controls" id="modal-buttons"></div></section>`;
  document.querySelector(".modal-shade")?.remove();
  document.body.append(layer);
  modalClose = () => {
    layer.remove();
    modalClose = null;
  };
  buttons.forEach(([label, fn, cls]) =>
    layer.querySelector("#modal-buttons").append(
      btn(
        label,
        () => {
          modalClose?.();
          fn();
        },
        cls,
      ),
    ),
  );
  // A key held while driving must not activate the newly focused dialog button.
  let freshSpace = false;
  layer.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      if (e.repeat) e.preventDefault();
      else freshSpace = true;
    }
  });
  layer.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      if (!freshSpace) e.preventDefault();
      freshSpace = false;
    }
  });
  layer.querySelector("button")?.focus();
}
function home() {
  finalStage = 0;
  base(
    "home",
    `<main class="hero cover-hero"><div class="cover-kicker">АВТОДРОМ · ИГРЫ · ТВЁРДЫЙ Р</div><h1>Гоночный<br><span>кубок</span><i class="cover-stripe" aria-hidden="true"></i></h1><div class="actions"><button class="primary" id="start">Начать гонку <span>→</span></button><button class="secondary" id="continue" ${state.started ? "" : "disabled"}>Продолжить гонку</button><button class="secondary" id="free">Мини-игры ↗</button></div></main>`,
    "race",
  );
  W.prepareCircuit(state.color,state.car,state.style);
  W.circuitCover(0);
  W.frame((dt,now)=>W.circuitCover(now));
  $("#start").onclick = () =>
    state.started
      ? modal(
          "Новое приключение?",
          "<p>Текущий маршрут и награды будут заменены новым приключением. Настройки педагога сохранятся.</p>",
          [
            ["Начать заново", setup],
            ["Отмена", () => {}, "secondary"],
          ],
        )
      : setup();
  $("#continue").onclick = beginLesson;
  $("#free").onclick = library;
}
function setup() {
  base(
    "setup",
    `<main class="screen panel"><span class="eyebrow">ТВОЯ ИСТОРИЯ НАЧИНАЕТСЯ</span><h1>Знакомься, твоя команда</h1><p class="muted">Все машины одинаково быстрые. Выбирай ту, которая нравится!</p><label class="field">Имя гонщика<input id="name" maxlength="24" value="${esc(state.name)}" placeholder="Как тебя зовут?"></label><div class="choices" id="car-choices">${["Спринт", "Ралли", "Вояж", "Молния"].map((n, i) => `<button class="choice ${i === state.car ? "active" : ""}" data-car="${i}"><span class="car-choice">${["🚗", "🏎️", "🚙", "🚕"][i]}</span><br>${n}</button>`).join("")}</div><p class="muted">Любимый цвет</p><div class="choices" id="colors"></div><div class="controls"><button class="primary" id="go">На трассу →</button></div></main>`,
    "home",
  );
  let type = state.car,
    color = state.color;
  document.querySelectorAll("[data-car]").forEach(
    (b) =>
      (b.onclick = () => {
        type = +b.dataset.car;
        document
          .querySelectorAll("[data-car]")
          .forEach((x) => x.classList.toggle("active", x === b));
        W.setWorld("home", color, type);
      }),
  );
  colors.forEach((c) => {
    let b = btn(
      "",
      () => {
        color = c;
        $("#colors")
          .querySelectorAll("button")
          .forEach((x) => x.classList.toggle("active", x === b));
        W.setWorld("home", color, type);
      },
      "swatch" + (c === color ? " active" : ""),
    );
    b.style.background = c;
    b.setAttribute("aria-label", "Цвет " + c);
    $("#colors").append(b);
  });
  $("#go").onclick = () => {
    const settings = state.settings,
      name = $("#name").value.trim() || "Гонщик";
    state = { ...defaults(), settings, name, car: type, color, started: true };
    save();
    beginLesson();
  };
}
function beginLesson() {
  if (state.settings.warmup === false) map();
  else warmupSelect(() => map());
}
function warmupSelect(done = () => map()) {
  const valid = new Set(EXERCISES.map((e) => e.id));
  let selected = new Set(
    (state.settings.warmupSelection ?? [...valid]).filter((id) =>
      valid.has(id),
    ),
  );
  const favorites = new Set(
    (state.settings.warmupFavorites || []).filter((id) => valid.has(id)),
  );
  base(
    "warmup",
    `<main class="screen panel warmup-screen"><div class="screen-head"><h1>Артикуляционная гимнастика</h1><button class="secondary small" id="warmup-home">В меню</button></div><div class="warmup-toolbar"><div class="row"><button class="secondary small" id="warmup-all">Все</button><button class="secondary small" id="warmup-favorites">Избранные</button><button class="secondary small" id="warmup-clear">Снять выбор</button></div><span id="warmup-count" aria-live="polite"></span></div><div id="warmup-grid" class="warmup-grid"></div><div class="controls warmup-actions"><button class="primary" id="warmup-begin">Начать разминку</button><button class="secondary" id="warmup-skip">Сразу к поездке</button></div></main>`,
    "home",
  );
  const render = () => {
    state.settings.warmupSelection = [...selected];
    state.settings.warmupFavorites = [...favorites];
    save();
    $("#warmup-count").textContent = `Выбрано: ${selected.size}`;
    $("#warmup-begin").disabled = !selected.size;
    $("#warmup-grid").innerHTML = "";
    EXERCISES.forEach((ex) => {
      const tile = document.createElement("div");
      tile.className = "warmup-tile" + (selected.has(ex.id) ? " selected" : "");
      const choose = btn(
        "",
        () => {
          selected.has(ex.id) ? selected.delete(ex.id) : selected.add(ex.id);
          render();
        },
        "warmup-pick",
      );
      choose.dataset.exercise = ex.id;
      choose.setAttribute("aria-pressed", selected.has(ex.id));
      choose.setAttribute("aria-label", ex.name);
      choose.innerHTML = `<span class="warmup-check" aria-hidden="true">${selected.has(ex.id) ? "✓" : ""}</span><img src="${warmupImage(ex)}" alt="" draggable="false"><b>${ex.name}</b>`;
      const star = btn(
        favorites.has(ex.id) ? "★" : "☆",
        () => {
          favorites.has(ex.id) ? favorites.delete(ex.id) : favorites.add(ex.id);
          render();
        },
        "warmup-star",
      );
      star.dataset.favorite = ex.id;
      star.setAttribute("aria-label", "В избранное: " + ex.name);
      star.setAttribute("aria-pressed", favorites.has(ex.id));
      tile.append(choose, star);
      $("#warmup-grid").append(tile);
    });
  };
  $("#warmup-home").onclick = home;
  $("#warmup-all").onclick = () => {
    selected = new Set(valid);
    render();
  };
  $("#warmup-favorites").onclick = () => {
    selected = new Set(favorites);
    render();
  };
  $("#warmup-clear").onclick = () => {
    selected.clear();
    render();
  };
  $("#warmup-skip").onclick = () => done();
  $("#warmup-begin").onclick = () => {
    sound();
    warmupPlay(
      EXERCISES.filter((e) => selected.has(e.id)),
      done,
    );
  };
  render();
}
function warmupPlay(list, done, index = 0) {
  if (!list.length) {
    done();
    return;
  }
  const ex = list[index];
  base(
    "warmup-player",
    `<main class="screen panel warmup-player"><div class="screen-head"><span class="eyebrow">РАЗМИНКА · ${index + 1} ИЗ ${list.length}</span><button class="secondary small" id="warmup-choose">Выбрать упражнения</button></div><h1>${ex.name}</h1><div class="warmup-timer"><label>Выполнение<select id="warmup-timer-duration" aria-label="Длительность таймера">${[5, 10, 15, 20, 30, 60].map((n) => `<option value="${n}">${n} сек</option>`).join("")}</select></label><output id="warmup-timer-clock" role="timer" aria-live="off"></output><button class="primary small" id="warmup-timer-toggle">▶ Старт</button><button class="secondary small" id="warmup-timer-reset" aria-label="Сбросить таймер">↺ Сброс</button><span id="warmup-timer-status" role="status"></span></div><img class="warmup-large" src="${warmupImage(ex)}" alt="${ex.name}"><details class="warmup-note"><summary>Подсказка логопеду</summary><p>${esc(state.settings.warmupNotes?.[ex.id] || ex.note)}</p><label class="field">Своя подсказка<textarea id="warmup-note-text" maxlength="500">${esc(state.settings.warmupNotes?.[ex.id] || ex.note)}</textarea></label><button class="secondary small" id="warmup-note-save">Сохранить</button></details><div class="controls"><button class="secondary" id="warmup-prev" ${index === 0 ? "disabled" : ""}>Назад</button><button class="primary" id="warmup-next">${index === list.length - 1 ? "К поездке →" : "Следующее →"}</button></div><button class="warmup-exit" id="warmup-finish">Закончить разминку</button></main>`,
    "home",
  );
  const allowed = [5, 10, 15, 20, 30, 60];
  let duration = allowed.includes(+state.settings.warmupTimerDuration)
    ? +state.settings.warmupTimerDuration
    : 10;
  let remaining = duration * 1000,
    deadline = 0,
    running = true,
    finished = false;
  deadline = performance.now() + remaining;
  $("#warmup-timer-duration").value = String(duration);
  const drawTimer = () => {
    const seconds = Math.max(0, Math.ceil(remaining / 1000));
    $("#warmup-timer-clock").textContent =
      String(Math.floor(seconds / 60)).padStart(2, "0") +
      ":" +
      String(seconds % 60).padStart(2, "0");
    $("#warmup-timer-toggle").textContent = running
      ? "Ⅱ Пауза"
      : finished
        ? "▶ Повторить"
        : remaining < duration * 1000
          ? "▶ Продолжить"
          : "▶ Старт";
    $("#warmup-timer-toggle").setAttribute("aria-pressed", running);
    $("#warmup-timer-status").textContent = finished
      ? "Готово"
      : !running && remaining < duration * 1000
        ? "Пауза"
        : "";
  };
  const pauseTimer = () => {
    if (!running) return;
    remaining = Math.max(0, deadline - performance.now());
    running = false;
    drawTimer();
  };
  const resetTimer = () => {
    running = true;
    finished = false;
    remaining = duration * 1000;
    deadline = performance.now() + remaining;
    drawTimer();
  };
  $("#warmup-timer-toggle").onclick = () => {
    sound();
    if (running) {
      pauseTimer();
      return;
    }
    if (finished) {
      remaining = duration * 1000;
      finished = false;
    }
    running = true;
    deadline = performance.now() + remaining;
    drawTimer();
  };
  $("#warmup-timer-reset").onclick = resetTimer;
  $("#warmup-timer-duration").onchange = () => {
    duration = +$("#warmup-timer-duration").value;
    state.settings.warmupTimerDuration = duration;
    save();
    resetTimer();
  };
  const timer = setInterval(() => {
    if (!running) return;
    if (modalClose) {
      pauseTimer();
      return;
    }
    remaining = Math.max(0, deadline - performance.now());
    if (remaining === 0) {
      running = false;
      finished = true;
      sound(660);
    }
    drawTimer();
  }, 100);
  const hide = () => {
    if (document.hidden) pauseTimer();
  };
  document.addEventListener("visibilitychange", hide);
  cleanup = () => {
    clearInterval(timer);
    document.removeEventListener("visibilitychange", hide);
    running = false;
  };
  drawTimer();
  $("#warmup-choose").onclick = () => warmupSelect(done);
  $("#warmup-prev").onclick = () => {
    if (index > 0) warmupPlay(list, done, index - 1);
  };
  $("#warmup-next").onclick = () =>
    index === list.length - 1 ? done() : warmupPlay(list, done, index + 1);
  $("#warmup-finish").onclick = () => done();
  $("#warmup-note-save").onclick = () => {
    state.settings.warmupNotes ||= {};
    state.settings.warmupNotes[ex.id] = $("#warmup-note-text").value.trim();
    save();
    toast("Подсказка сохранена");
  };
}

function grandPrix() {
  if (!state.started) return home();
  context = null;
  pending = null;
  free = false;
  finalStage = 0;
  const previous = state.circuitRun;
  if (!previous || previous.finished) {
    const words = shuffled(material(state.settings));
    state.circuitRun = {
      id: Date.now().toString(36),
      distance: 0,
      lateral: 0,
      rivals: [8, 16],
      elapsed: 0,
      pitDone: [],
      words: Array.from({ length: 3 }, (_, i) => words[i % words.length]),
      speech: state.settings.speech !== false,
      finished: false,
      awarded: false,
    };
  }
  const q = state.circuitRun;
  const activities = activitiesForRun(q);
  if (q.distance === 0 && q.elapsed === 0 && q.pitDone.length === 0) {
    const words = shuffled(material(state.settings));
    q.words = Array.from({ length: 3 }, (_, i) => words[i % words.length]);
    q.speech = state.settings.speech !== false;
  }
  base(
    "grandprix",
    `<div class="gp-topline"><span>АВТОДРОМ · ГЛАВНАЯ ГОНКА</span><button id="gp-pause" class="gp-small">Ⅱ Пауза</button><button id="gp-garage" class="gp-small">Гараж</button><button id="gp-library" class="gp-small">Мини-игры</button></div><div class="gp-race-info"><div><small>ПОЗИЦИЯ</small><strong id="gp-place">3 <em>/ 3</em></strong></div><div><small>КРУГ</small><strong id="gp-lap">1 <em>/ 3</em></strong></div><div><small>ИГРЫ</small><strong id="gp-pits">0 <em>/ ${RACE_ACTIVITIES.length}</em></strong></div></div><canvas id="gp-track-map" width="160" height="150" aria-label="Схема трассы и положение автомобилей"></canvas><div class="gp-bottom-info"><strong id="gp-speed">0 <small>км/ч</small></strong><span id="gp-time">0:00</span><div class="gp-progress"><i id="gp-progress"></i></div></div><div class="gp-steering"><button id="gp-left" aria-label="Влево">◀</button><button id="gp-right" aria-label="Вправо">▶</button></div><div class="gp-pedals"><button id="gp-brake" aria-pressed="false">Тормоз</button><button id="gp-drive">↑ Газ</button></div><div id="gp-activity-hint" class="gp-activity-hint" hidden><span class="gp-flag-mark" aria-hidden="true"></span><span><b id="gp-activity-name"></b><small id="gp-activity-gap"></small></span></div><div class="gp-banner" id="gp-banner" role="status" hidden></div><div class="gp-start-card" id="gp-start-card"><span class="gp-eyebrow">ГОНОЧНЫЙ КУБОК</span><h1>За руль.</h1><p>2 круга с играми · 1 свободный круг</p><p class="gp-help">Удерживай ↑ / W или «Газ» · ← → / A D — руль · ↓ / S — тормоз</p><button id="gp-start">↑ ${q.distance > 0 ? "Продолжить гонку" : "Начать гонку"}</button></div>`,
    "race",
  );
  q.words.forEach((item) => {
    const img = new Image();
    img.src = `${import.meta.env.BASE_URL}images/watercolor/${item.id}.png`;
  });
  if (q.trackVersion !== 2) {
    q.distance = 0;
    q.lateral = 0;
    q.rivals = [8, 16];
    q.elapsed = 0;
    q.pitDone = [];
    q.heading = 0;
    q.trackVersion = 2;
  }
  const length = W.prepareCircuit(state.color, state.car, state.style),
    raceDistance = length * 2,
    total = length * 3;
  if(q.activityVersion===1){
    const mapping=[0,1,3,4,5];
    q.pitDone=q.pitDone.map(i=>mapping[i]);
    for(let i=0;i<mapping.length;i++){if(state.completed.includes(`circuit-${q.id}-${i}`))state.completed.push(`circuit-${q.id}-${RACE_ACTIVITIES[mapping[i]].game}`);}
    q.activityVersion=2;
  }else if(q.activityVersion!==2){q.activityVersion=2;q.distance=0;q.elapsed=0;q.lateral=0;q.heading=0;q.rivals=[8,16];q.pitDone=[];}
  const stops = activities.map(a=>a.at*raceDistance);
  let active = false,
    countdown = 0,
    ended = false,
    keys = {},
    braking = false,
    speed = 0,
    lateral = q.lateral || 0,
    saveAfter = 0,
    bannerTime = 0,
    contact = 0,
    engine = null;
  q.total = total;
  $("#gp-pits").parentElement.hidden = false;
  q.distance = Math.min(total, Math.max(0, q.distance || 0));
  q.rivals ||= [8, 16];
  q.rivalMotion = { pace: q.rivalMotion?.pace ?? 18, speeds: [0, 0] };
  q.pitDone ||= [];
  q.freeLap=q.distance>=raceDistance && activities.every((_,i)=>q.pitDone.includes(i));
  if (q.freeLap) {
    q.freeChase ||= createFreeChase(q.distance, total);
    q.freeChase.motion.speeds = [0, 0];
  }
  W.circuitFreeLap(q.freeLap);
  const handling = {
    lateral,
    speed: 0,
    heading: q.heading || 0,
    yaw: 0,
    slip: 0,
    steer: 0,
  };
  let steerPulse = 0,
    pulseTime = 0;
  const visual = (visualSpeed, dt) => W.circuitVisual(q.distance, lateral, q.rivals,
    visualSpeed, dt, handling, q.freeLap ? q.freeChase?.distances || [] : []);
  const persist = () => {
    q.heading = handling.heading;
    q.lateral = lateral;
    save();
  };
  const hud = () => {
    const chasing = q.freeLap && q.freeChase?.distances.length > 0;
    const place = chasing ? 1 + q.freeChase.distances.filter(d => d > q.distance).length
      : q.racePlace ?? (1 + q.rivals.filter((d) => d > q.distance).length);
    $("#gp-place").innerHTML = `${place} <em>/ 3</em>`;
    $('#gp-place').parentElement.querySelector('small').textContent = chasing ? 'ПОГОНЯ' : 'ПОЗИЦИЯ';
    $("#gp-lap").innerHTML =
      `${Math.min(3, Math.floor(q.distance / length) + 1)} <em>/ 3${q.freeLap ? " · свободный" : ""}</em>`;
    $("#gp-place").parentElement.hidden=!!q.freeLap && !chasing;
    $("#gp-pits").innerHTML =
      `${q.pitDone.length} <em>/ ${activities.length}</em>`;
    const upcoming=activities.findIndex((_,i)=>!q.pitDone.includes(i)),gap=upcoming<0?Infinity:stops[upcoming]-q.distance;
    $('#gp-activity-hint').hidden=gap>150||gap<0;
    if(upcoming>=0){$('#gp-activity-name').textContent=activities[upcoming].title;$('#gp-activity-gap').textContent=Math.max(0,Math.ceil(gap))+' м';}
    $("#gp-speed").innerHTML = `${Math.round(speed * 3.6)} <small>км/ч</small>`;
    $("#gp-time").textContent =
      `${Math.floor(q.elapsed / 60)}:${String(Math.floor(q.elapsed % 60)).padStart(2, "0")}`;
    $("#gp-progress").style.width =
      Math.min(100, (q.distance / total) * 100) + "%";
    $('#gp-drive').textContent='↑ Газ';
    $('#gp-drive').setAttribute('aria-pressed',String(!!(keys.arrowup||keys.w||keys.screenGas)));
    $("#gp-brake").setAttribute("aria-pressed", String(braking));
  };
  const banner = (text, seconds = 2) => {
    $("#gp-banner").hidden = false;
    $("#gp-banner").textContent = text;
    bannerTime = seconds;
  };
  const engineStart = () => {
    if (engine) return;
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)(),
        osc = ac.createOscillator(),
        gain = ac.createGain(),
        filter = ac.createBiquadFilter();
      osc.type = "sawtooth";
      osc.frequency.value = 45;
      filter.type = "lowpass";
      filter.frequency.value = 220;
      gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(ac.destination);
      osc.start();
      ac.resume();
      engine = { ac, osc, gain };
    } catch {}
  };
  const pit = index => {
    active=false;speed=0;keys={};braking=false;persist();
    q.pendingActivity=index;save();
    launch(activities[index].game, {id:`circuit-${q.id}-${activities[index].game}`,circuit:true,runId:q.id,stopIndex:index});
  };
  const pendingPit=()=>stops.findIndex((d,i)=>q.distance>=d&&!q.pitDone.includes(i));
  const result = () => {
    active = false;
    speed = 0;
    ended = true;
    q.finished = true;
    const place = q.racePlace ?? (1 + q.rivals.filter((d) => d > q.distance).length);
    const prize = [20, 15, 10][place - 1],
      points = [100, 75, 50][place - 1] + q.pitDone.length * 10;
    if (!q.awarded) {
      q.awarded = true;
      state.coins += prize;
      state.wins += place === 1 ? 1 : 0;
      state.raceBest = Math.max(state.raceBest || 0, points);
      save();
    }
    hud();
    engine?.gain.gain.setTargetAtTime(0, engine.ac.currentTime, 0.1);
    modal(
      place === 1 ? "Победа!" : "Финиш!",
      `<div class="gp-results"><strong>${place}<small>место из 3</small></strong><p>${esc(state.name)} · ${points} очков</p><p>+${prize} монет · Игры: ${q.pitDone.length}/${activities.length}</p>${q.freeChase?.distances.length ? `<p>Погоня на свободном круге: ${q.freeChase.place} место из 3</p>` : ''}</div>`,
      [
        [
          "Ещё гонка",
          () => {
            state.circuitRun = null;
            save();
            grandPrix();
          },
        ],
        ["В меню", home, "secondary"],
      ],
    );
  };
  const begin = () => {
    engineStart();
    $("#gp-start-card").hidden = true;
    const pending = pendingPit();
    if (pending >= 0) {
      pit(pending);
      return;
    }
    if(q.distance>0){active=true;braking=false;keys={};banner('Поехали',1);hud();return;}
    countdown = 3;
    banner("3", 4);
  };
  $("#gp-start").onclick = begin;
  // Pointer capture releases throttle even when the finger leaves the pedal.
  const pedal=$('#gp-drive');
  pedal.onpointerdown=e=>{
    if(ended||modalClose)return;
    e.preventDefault();pedal.setPointerCapture(e.pointerId);
    forward();keys.screenGas=true;braking=false;hud();
  };
  const releaseGas=()=>{keys.screenGas=false;if(!ended)hud();};
  pedal.onpointerup=pedal.onpointercancel=pedal.onlostpointercapture=releaseGas;
  pedal.onclick=e=>{if(e.detail===0)forward();};
  $("#gp-brake").onclick = () => {
    braking = !braking;
    hud();
  };
  const steer = (value) => {
    if (ended || modalClose || countdown || !$("#gp-start-card").hidden) return;
    steerPulse = value;
    pulseTime = 0.28;
  };
  $("#gp-left").onclick = () => steer(-1);
  $("#gp-right").onclick = () => steer(1);
  const pause = () => {
    if (ended || modalClose) return;
    const wasActive = active;
    active = false;
    speed = 0;
    keys = {};
    q.rivalMotion.speeds = [0, 0];
    if (q.freeChase) q.freeChase.motion.speeds = [0, 0];
    persist();
    hud();
    modal("Пауза", "<p>Гонка и соперники остановлены.</p>", [
      [
        "Продолжить",
        () => {
          active = wasActive;
          hud();
        },
      ],
      [
        "Новый заезд",
        () => {
          state.circuitRun = null;
          save();
          grandPrix();
        },
        "secondary",
      ],
      ["В меню", home, "secondary"],
    ]);
  };
  $("#gp-pause").onclick = pause;
  $("#gp-library").onclick = library;
  $("#gp-garage").onclick = () => {
    persist();
    garage(() => grandPrix());
  };
  const forward = () => {
    if(ended || modalClose || countdown>0)return;
    if(!$('#gp-start-card').hidden){begin();return;}
    const pending=pendingPit();
    if(pending>=0){pit(pending);return;}
    engineStart();active=true;braking=false;hud();
  };
  const down = (e) => {
    if (e.target.matches("input,textarea,select") || ended || modalClose)
      return;
    const k = e.key.toLowerCase();
    if (
      ![
        "arrowleft",
        "arrowright",
        "arrowup",
        "arrowdown",
        "a",
        "d",
        "w",
        "s",
        " ",
        "escape",
      ].includes(k)
    )
      return;
    e.preventDefault();
    if (k === " " || k === "escape") {
      pause();
      return;
    }
    if(k==='arrowup'||k==='w'){
      forward();
      if(!ended&&!modalClose)keys[k]=true;
      return;
    }
    if (!$('#gp-start-card').hidden || countdown > 0) return;
    keys[k]=true;
  };
  const up = (e) => {
    keys[e.key.toLowerCase()] = false;
  };
  const hide = () => {
    if (document.hidden) pause();
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", pause);
  document.addEventListener("visibilitychange", hide);
  cleanup = () => {
    ended = true;
    persist();
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", pause);
    document.removeEventListener("visibilitychange", hide);
    if (engine) {
      engine.osc.stop();
      engine.ac.close();
    }
    W.frame(() => {});
  };
  persist();
  hud();
  {const next=activities.findIndex((_,i)=>!q.pitDone.includes(i));W.circuitActivity(next,next<0?Infinity:stops[next]-q.distance);}
  visual(0, 0);
  W.frame((dt) => {
    if (ended) return;
    if (engine) {
      engine.osc.frequency.setTargetAtTime(
        42 + speed * 2.3,
        engine.ac.currentTime,
        0.08,
      );
      engine.gain.gain.setTargetAtTime(
        active && !modalClose && state.settings.sound ? 0.018 : 0,
        engine.ac.currentTime,
        0.1,
      );
    }
    if (modalClose) return;
    if (countdown > 0) {
      const before = Math.ceil(countdown);
      countdown = Math.max(0, countdown - dt);
      if (Math.ceil(countdown) !== before) {
        if (countdown > 0) banner(String(Math.ceil(countdown)), 4);
        else {
          active = true;
          banner("СТАРТ", 1.2);
          sound(640);
        }
      }
      hud();
      return;
    }
    if (bannerTime > 0) {
      bannerTime -= dt;
      if (bannerTime <= 0) $("#gp-banner").hidden = true;
    }
    if (active) {
      pulseTime = Math.max(0, pulseTime - dt);
      const steerInput =
        (keys.arrowright || keys.d ? 1 : 0) -
          (keys.arrowleft || keys.a ? 1 : 0) ||
        (pulseTime > 0 ? steerPulse : 0);
      handling.speed = speed;
      const movement = stepDriving(
        handling,
        {
          steer: steerInput,
          gas: keys.arrowup || keys.w || keys.screenGas,
          brake: braking || keys.arrowdown || keys.s,
          curvature: W.circuitCurvature(q.distance),
          corner: W.circuitSpeedLimit(q.distance),
        },
        dt,
      );
      lateral = handling.lateral;
      speed = handling.speed;
      const offroad = movement.offroad;
      if (movement.drifting && bannerTime <= 0)
        banner("Занос — отпусти газ и выровняй руль", 1.2);
      if (movement.impact && bannerTime <= 0)
        banner("Касание ограждения — сбавь скорость", 1.2);
      q.elapsed += dt;
      q.distance = Math.min(total, q.distance + movement.advance);
      if (!q.freeLap) q.rivals = stepRivals(q.rivals, q.rivalMotion, {
        playerDistance: q.distance,
        playerAdvance: movement.advance,
        difficulty: state.settings.difficulty,
        speedLimit: W.circuitSpeedLimit,
      }, dt);
      if (offroad && bannerTime <= 0)
        banner("Обочина — вернись на асфальт", 1.5);
      contact = Math.max(0, contact - dt);
      if (
        contact === 0 &&
        (q.freeLap ? q.freeChase?.distances || [] : q.rivals).some(
          (d, i) =>
            Math.abs(d - q.distance) < 4 &&
            Math.abs(
              lateral - ((i ? 2.5 : -2.5) + Math.sin(d * 0.015 + i) * 0.45),
            ) < 1.8,
        )
      ) {
        speed *= 0.65;
        contact = 1.5;
        banner("Контакт — держи дистанцию", 1.5);
      }
      const pending = pendingPit();
      if (pending >= 0) {
        q.distance = stops[pending];
        visual(0, 0);
        pit(pending);
        return;
      }
      if(!q.freeLap && q.distance>=raceDistance && activities.every((_,i)=>q.pitDone.includes(i))){
        q.racePlace=1+q.rivals.filter(d=>d>raceDistance).length;
        q.freeLap=true;q.freeChase=createFreeChase(q.distance,total);contact=0;persist();W.circuitFreeLap(true);
        banner('Свободный круг — все задания позади!',4);
      }
      if (q.freeLap && stepFreeChase(q.freeChase, {
        playerDistance: q.distance, playerAdvance: movement.advance,
        total, difficulty: state.settings.difficulty, speedLimit: W.circuitSpeedLimit,
      }, dt)) {
        persist();
        banner('Новые соперники на трассе!', 2.5);
      }
      if (q.distance >= total) {
        visual(0, dt);
        result();
        return;
      }
      saveAfter += dt;
      if (saveAfter >= 1) {
        saveAfter = 0;
        persist();
      }
    }
    const nextActivity=activities.findIndex((_,i)=>!q.pitDone.includes(i));
    W.circuitActivity(nextActivity,nextActivity<0?Infinity:stops[nextActivity]-q.distance);
    if(active && nextActivity>=0 && stops[nextActivity]-q.distance<100 && stops[nextActivity]>q.distance && bannerTime<=0)banner(`Впереди: ${activities[nextActivity].title}`,2);
    visual(speed, dt);
    hud();
  });
}

function adventure(options = {}) {
  if (!state.started) return home();
  const layout = createLabyrinth();
  state.labyrinth ||= { x: 1, y: 1, dx: 0, dy: 1, collected: [] };
  const j = state.labyrinth;
  if (!layout.grid[j.y]?.[j.x]) {
    j.x = 1;
    j.y = 1;
  }
  j.collected ||= [];
  save();
  pending = null;
  context = null;
  free = false;
  busy = false;
  base(
    "adventure",
    `<div class="lab-hud"><span class="pill" id="lab-status"></span><button class="secondary small" id="lab-pause">Ⅱ Пауза</button><button class="secondary small" id="lab-garage">Гараж</button><button class="secondary small" id="lab-library">Мини-игры</button></div><aside class="lab-map panel"><canvas id="lab-map" width="304" height="304" aria-label="Карта лабиринта: машинка, задания, замедления и финиш"></canvas><div class="lab-legend"><span>● Ты</span><span class="lab-required-key">● Для кубка</span><span class="lab-bonus-key">＋ Бонус</span><span>▧ Замедление</span><span>🏁 Финиш</span></div></aside><div class="lab-notice pill" id="lab-notice" role="status"></div><div class="lab-controls"><button class="control lab-up" data-direction="0,-1" aria-label="Вверх">▲</button><button class="control" data-direction="-1,0" aria-label="Влево">◀</button><button class="primary" id="journey-go">▶ Ехать</button><button class="control" data-direction="1,0" aria-label="Вправо">▶</button><button class="control lab-down" data-direction="0,1" aria-label="Вниз">▼</button></div>`,
    "race",
  );
  W.prepareLabyrinth(layout);
  let running = false,
    moving = null,
    closed = false,
    queued = null,
    declined = null;
  let message =
    options.reward || "Для кубка — 5 золотых отметок. Синие — бонусы.";
  const done = (s) =>
    state.completed.includes(s.id) ||
    (s.checkpoint !== null && state.cups.includes(s.checkpoint));
  const atStation = () =>
    layout.stations.find(
      (s) => s.x === j.x && s.y === j.y && !done(s) && s.id !== declined,
    );
  const mapCanvas = $("#lab-map"),
    ctx = mapCanvas.getContext("2d");
  const hud = () => {
    $("#lab-status").textContent =
      `🏆 ${state.cups.length}/5 · ⭐ ${labyrinthBonus(state, layout.stations)}`;
    $("#lab-status").title =
      "Для кубка: Мемори, крестики-нолики, заправка, пит-стоп, мини-гонка. Бонусная игра: +20 очков.";
    $("#journey-go").textContent = running
      ? "■ Стоп"
      : atStation()
        ? "Открыть игру"
        : "▶ Ехать";
    $("#journey-go").setAttribute("aria-pressed", String(running));
    $("#lab-notice").textContent = message;
    const unit = 304 / layout.size;
    ctx.clearRect(0, 0, 304, 304);
    layout.grid.forEach((row, y) =>
      row.forEach((open, x) => {
        ctx.fillStyle = open ? "#f9f4dd" : "#83a67a";
        ctx.fillRect(x * unit, y * unit, unit, unit);
      }),
    );
    for (const [x, y] of layout.mud) {
      ctx.fillStyle = "#b4895a";
      ctx.fillRect(x * unit + 2, y * unit + 2, unit - 4, unit - 4);
    }
    for (const s of layout.stations) {
      ctx.fillStyle = done(s)
        ? "#b6c8ad"
        : s.checkpoint !== null
          ? "#d48b18"
          : "#258cb5";
      ctx.fillRect(s.x * unit + 3, s.y * unit + 3, unit - 6, unit - 6);
    }
    ctx.fillStyle = "#253c34";
    ctx.fillRect(
      layout.finish[0] * unit + 2,
      layout.finish[1] * unit + 2,
      unit - 4,
      unit - 4,
    );
    ctx.fillStyle = "#e85642";
    ctx.beginPath();
    ctx.arc(
      (j.x + 0.5) * unit,
      (j.y + 0.5) * unit,
      unit * 0.35,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    const coins = $(".nav>.pill");
    if (coins) coins.textContent = `🪙 ${state.coins}`;
  };
  const enter = (s) => {
    running = false;
    save();
    if (s.game === "garage") {
      state.completed.push(s.id);
      save();
      garage(() => map());
      return;
    }
    const play = () =>
      launch(s.game, {
        id: s.id,
        labyrinth: true,
        ...(s.checkpoint !== null ? { checkpoint: s.checkpoint } : {}),
      });
    if (s.checkpoint === null) {
      modal(s.title, `<p>По желанию · +${OPTIONAL_POINTS} бонусных очков</p>`, [
        ["Играть", play],
        [
          "Проехать",
          () => {
            declined = s.id;
            running = true;
            message = "";
            hud();
          },
          "secondary",
        ],
      ]);
    } else play();
  };
  const arrive = () => {
    if (
      declined &&
      !layout.stations.some(
        (s) => s.id === declined && s.x === j.x && s.y === j.y,
      )
    )
      declined = null;
    const coin = layout.coins.find(
      (c) => c.x === j.x && c.y === j.y && !j.collected.includes(c.id),
    );
    if (coin) {
      j.collected.push(coin.id);
      state.coins++;
      sound(800);
      message = "+1 монета";
    }
    const muddy = layout.mud.some(([x, y]) => x === j.x && y === j.y);
    if (muddy) message = "Вязкая дорога — едем медленнее";
    save();
    const s = atStation();
    if (s) {
      enter(s);
      return;
    }
    if (j.x === layout.finish[0] && j.y === layout.finish[1]) {
      running = false;
      if (state.cups.length === 5) {
        modal("Финиш лабиринта!", "<p>Все пять деталей собраны.</p>", [
          ["На чемпионский заезд", startFinal],
          ["Ещё покататься", () => {}, "secondary"],
        ]);
      } else
        message =
          state.cups.length === 5
            ? "Финиш!"
            : "До финала осталось деталей: " + (5 - state.cups.length);
    }
  };
  const direction = (dx, dy) => {
    if (modalClose) return;
    if (moving) {
      queued = [dx, dy];
      running = true;
      return;
    }
    j.dx = dx;
    j.dy = dy;
    running = true;
    message = "";
    hud();
  };
  document
    .querySelectorAll("[data-direction]")
    .forEach(
      (b) =>
        (b.onclick = () =>
          direction(...b.dataset.direction.split(",").map(Number))),
    );
  $("#journey-go").onclick = () => {
    if (
      !moving &&
      j.x === layout.finish[0] &&
      j.y === layout.finish[1] &&
      state.cups.length === 5
    ) {
      arrive();
      hud();
      return;
    }
    if (atStation() && !moving) {
      enter(atStation());
      return;
    }
    running = !running;
    message = "";
    hud();
  };
  const pause = () => {
    running = false;
    message = "Пауза";
    hud();
  };
  $("#lab-pause").onclick = pause;
  $("#lab-garage").onclick = () => garage(() => map());
  $("#lab-library").onclick = () => library();
  const key = (e) => {
    if (e.target.matches("input,textarea,select") || modalClose) return;
    const directions = {
      ArrowUp: [0, -1],
      w: [0, -1],
      ArrowDown: [0, 1],
      s: [0, 1],
      ArrowLeft: [-1, 0],
      a: [-1, 0],
      ArrowRight: [1, 0],
      d: [1, 0],
    };
    if (directions[e.key]) {
      e.preventDefault();
      direction(...directions[e.key]);
    } else if (e.key === " " || e.key === "Escape") {
      e.preventDefault();
      pause();
    }
  };
  const hide = () => {
    if (document.hidden) pause();
  };
  window.addEventListener("keydown", key);
  window.addEventListener("blur", pause);
  document.addEventListener("visibilitychange", hide);
  cleanup = () => {
    closed = true;
    running = false;
    save();
    window.removeEventListener("keydown", key);
    window.removeEventListener("blur", pause);
    document.removeEventListener("visibilitychange", hide);
  };
  W.labyrinthVisual(
    j.x,
    j.y,
    j.dx || 0,
    j.dy ?? 1,
    layout.stations.filter(done).map((s) => s.id),
    j.collected,
  );
  hud();
  W.frame((dt) => {
    if (closed) return;
    if (modalClose) {
      if (running) {
        running = false;
        hud();
      }
      return;
    }
    if (running) {
      if (!moving) {
        const nx = j.x + (j.dx || 0),
          ny = j.y + (j.dy ?? 1);
        if (!layout.grid[ny]?.[nx]) {
          running = false;
          message = "Поворот: выбери другое направление";
          hud();
          return;
        }
        moving = { x: nx, y: ny, t: 0 };
      }
      const slow = layout.mud.some(
        ([x, y]) =>
          (x === j.x && y === j.y) || (x === moving.x && y === moving.y),
      );
      moving.t = Math.min(
        1,
        moving.t +
          Math.min(dt, 0.06) *
            (slow ? 0.65 : state.settings.difficulty === "easy" ? 1.35 : 1.8),
      );
      if (moving.t >= 1) {
        j.x = moving.x;
        j.y = moving.y;
        moving = null;
        if (queued) {
          [j.dx, j.dy] = queued;
          queued = null;
        }
        arrive();
        if (screen !== "adventure") return;
        hud();
      }
    }
    const t = moving?.t || 0;
    W.labyrinthVisual(
      moving ? j.x + (moving.x - j.x) * t : j.x,
      moving ? j.y + (moving.y - j.y) * t : j.y,
      j.dx || 0,
      j.dy ?? 1,
      layout.stations.filter(done).map((s) => s.id),
      j.collected,
    );
  });
}

function roadLegend(mode = "adventure", variant = "") {
  if (mode === "race")
    return `<div class="drive-legend" aria-label="Обозначения на дороге"><span><i class="legend-coin" aria-hidden="true"></i>${variant === "fuel" ? '<i class="legend-fuel" aria-hidden="true"></i>' : ""}Собирай</span><span><i class="legend-boost" aria-hidden="true"></i>Ускорение</span><span><i class="legend-cone" aria-hidden="true"></i>Объезжай</span></div>`;
  return `<div class="drive-legend" aria-label="Обозначения на дороге"><span><i class="legend-coin" aria-hidden="true"></i>Собирай</span><span><i class="legend-cone" aria-hidden="true"></i>Объезжай</span><span><i class="legend-flag" aria-hidden="true"></i>Задание</span></div>`;
}

function map(forceBoard = false) {
  if (forceBoard !== true) {
    if (state.settings.adventureView === "maze")
      adventure(typeof forceBoard === "object" ? forceBoard : {});
    else grandPrix();
    return;
  }
  pending = null;
  context = null;
  free = false;
  busy = false;
  if (!state.started) {
    home();
    return;
  }
  base(
    "map",
    `<aside class="map-info panel"><span class="eyebrow">РАЙОН ${Math.min(5, Math.floor(state.position / 6) + 1)} ИЗ 5</span><h1>${regions[Math.min(4, Math.floor(state.position / 6))]}</h1><div class="muted">${esc(state.name)}, приключение продолжается!</div><div class="progress"><div style="width:${(state.position / 29) * 100}%"></div></div><div class="row"><span class="badge">⚑ Клетка ${state.position + 1} / 30</span><span class="badge">🏆 ${state.cups.length} деталей</span></div><div class="controls" style="justify-content:flex-start"><button class="secondary small" id="garage">🔧 Гараж</button><button class="secondary small" id="library">Мини-игры</button></div><div class="legend">● Задание &nbsp; ◆ Бонус<br>⚑ Контрольная точка<br>На контрольных точках — обязательная остановка.</div></aside><aside class="map-label">${state.cups.length === 5 ? "🏁 Финал открыт!" : "Собери 5 деталей<br>чемпионского кубка"}</aside><div class="map-bottom panel"><div class="turbo"><b>🚙</b><p><strong>Турбо</strong><br>${state.cups.length === 5 ? "Финальная гонка ждёт тебя!" : "Интересно, что за следующим поворотом?"}</p></div><button class="primary" id="roll">${state.cups.length === 5 && !state.roaming ? "На финал 🏁" : "⚄ Бросить кубик"}</button></div>`,
  );
  $("#garage").onclick = garage;
  $("#library").onclick = library;
  if (state.roaming) {
    $(".map-info").append(
      btn("🏁 Чемпионский заезд", startFinal, "secondary small"),
    );
  }
  if (state.settings.adventureView !== "board") {
    $("#roll").textContent = "Вернуться к машине";
    $("#roll").onclick = () => map();
  } else
    $("#roll").onclick = () =>
      state.cups.length === 5 && !state.roaming ? startFinal() : roll();
}
function roll() {
  if (state.roaming && state.position === 29) {
    state.position = 0;
    save();
  }
  if (
    mandatory[state.position] &&
    !state.cups.includes(Math.floor(state.position / 6))
  ) {
    land(state.position, state.position);
    return;
  }
  if (busy) return;
  busy = true;
  const die = 1 + Math.floor(Math.random() * 3);
  $("#roll").disabled = true;
  $("#roll").textContent = `${die} ${die === 1 ? "шаг" : "шага"}`;
  let dest = Math.min(29, state.position + die);
  const checkpoint = Object.keys(mandatory)
    .map(Number)
    .find((p) => p > state.position && !state.cups.includes(Math.floor(p / 6)));
  if (checkpoint !== undefined) dest = Math.min(dest, checkpoint);
  const old = state.position;
  let p = old;
  const timer = setInterval(() => {
    p++;
    W.moveTo(p);
    if (p >= dest) {
      clearInterval(timer);
      state.position = dest;
      save();
      setTimeout(() => land(dest, old), 450);
    }
  }, 300);
  cleanup = () => clearInterval(timer);
}
function land(p, old, spoken = false) {
  if (state.settings.speech && !spoken) {
    speech(
      () => land(p, old, true),
      null,
      TASKS[p % 4],
      "Остановка на маршруте",
    );
    return;
  }
  busy = false;
  const checkpoint = mandatory[p] && !state.cups.includes(Math.floor(p / 6));
  if (checkpoint) {
    launch(mandatory[p], {
      id: `checkpoint-${p}`,
      checkpoint: Math.floor(p / 6),
    });
    return;
  }
  const fork = [2, 8, 14, 20, 26].find((i) => i > old && i <= p);
  if (fork !== undefined) {
    modal(
      "Какой дорогой поедем?",
      '<p class="muted">Две дороги снова встретятся у контрольной точки.</p>',
      [
        [
          `🌉 Через мост • ${games.find((g) => g[0] === cellGames[p])[2]} • 12 монет`,
          () => launch(cellGames[p], { id: `cell-${p}-bridge`, bonus: 2 }),
        ],
        [
          `🌲 Через парк • ${games.find((g) => g[0] === ["route", "diff", "detective", "conveyor", "guess"][Math.floor(fork / 6)])[2]} • 10 монет`,
          () =>
            launch(
              ["route", "diff", "detective", "conveyor", "guess"][
                Math.floor(fork / 6)
              ],
              { id: `cell-${p}-park` },
            ),
        ],
      ],
    );
    return;
  }
  if (p % 6 === 3) {
    context = { id: `chest-${p}` };
    reward(8, "В сундуке — монеты и наклейка!", "⭐");
    return;
  }
  if (p % 6 === 4) {
    context = { id: `surprise-${p}` };
    modal(
      "Сюрприз на дороге! 🚙",
      "<p>Турбо нашёл короткую дорогу к мастерской. Получи подарок — никаких пропусков хода!</p>",
      [["Забрать подарок", () => reward(5, "Подарок от Турбо", "🌟")]],
    );
    return;
  }
  if (p % 6 === 0 && p > 0) {
    garage();
    return;
  }
  launch(cellGames[p], { id: `cell-${p}` });
}
function speech(
  done,
  item = null,
  task = null,
  title = "Речевая остановка",
  force = false,
) {
  if (!state.settings.speech && !force) {
    done();
    return;
  }
  const pool = material(state.settings);
  item ||= pool[Math.floor(Math.random() * pool.length)];
  const assignment =
    task ||
    (state.settings.material === "phrases"
      ? "Повтори словосочетание"
      : TASKS[state.settings.speechType || 0]);
  modal(
    title,
    `<span class="eyebrow">ТВЁРДЫЙ Р • ${state.settings.material === "phrases" ? "СЛОВОСОЧЕТАНИЯ" : "СЛОВА"}</span><h3>${assignment}</h3>${photo(item, state.settings.captions)}<details class="teacher-answer"><summary>Подсказка логопеду</summary>${item.word}</details><p class="muted">Логопед слушает и подтверждает произношение.</p>`,
    state.settings.remoteLesson
      ? [
          [
            "Я назвал",
            () =>
              modal(
                "Ход логопеда",
                `<span class="role-badge">ЛОГОПЕД</span><p>Послушайте ответ ученика и подтвердите выполнение.</p>${photo(item, state.settings.captions)}<details class="teacher-answer"><summary>Подсказка логопеду</summary>${item.word}</details>`,
                [
                  ["Дальше", done],
                  [
                    "Повторить",
                    () => speech(done, item, task, title, force),
                    "secondary",
                  ],
                ],
              ),
          ],
        ]
      : [["Дальше", done]],
  );
}
function materialControls() {
  const toolbar = document.createElement("div");
  toolbar.className = "material-toolbar";
  toolbar.innerHTML = `<div class="segmented"><button data-material="words" class="${state.settings.material === "words" ? "active" : ""}">Слова</button><button data-material="phrases" class="${state.settings.material === "phrases" ? "active" : ""}">Словосочетания</button></div><label><input id="picture-captions" type="checkbox" ${state.settings.captions ? "checked" : ""}> Подписи</label><span class="footer-note">Твёрдый Р · смена режима начинает игру заново</span>`;
  document.querySelector(".screen-head").after(toolbar);
  toolbar.querySelectorAll("[data-material]").forEach(
    (b) =>
      (b.onclick = () => {
        state.settings.material = b.dataset.material;
        save();
        const task = pending;
        if (task) launch(task.id, context, task.options);
      }),
  );
  $("#picture-captions").onchange = (e) => {
    state.settings.captions = e.target.checked;
    save();
    document
      .querySelectorAll(".object-caption")
      .forEach((el) => (el.hidden = !state.settings.captions));
  };
}
function returnMap() {
  if (finalStage) {
    modal(
      "Вернуться на карту?",
      "<p>Финальный заезд начнётся заново. Все детали кубка сохранятся.</p>",
      [
        [
          "На карту",
          () => {
            finalStage = 0;
            map();
          },
        ],
        ["Остаться", () => {}, "secondary"],
      ],
    );
    return;
  }
  if (!state.started) library();
  else map();
}
function library() {
  finalStage = 0;
  base(
    "library",
    `<main class="screen panel"><div class="screen-head"><div><span class="eyebrow">ИГРАЙ В СВОЁМ РИТМЕ</span><h1>Маленькие игры, большие открытия</h1><p class="muted">Выбери любое задание. Маршрут приключения сохранится.</p></div><button class="secondary small" id="back">${state.started ? "На карту" : "В меню"}</button></div><div class="grid games">${games.map((g) => `<button class="game-card" data-game="${g[0]}"><span>${g[1]}</span><b>${g[2]}</b><p class="muted">${g[3]}</p></button>`).join("")}</div></main>`,
  );
  $("#back").onclick = () => (state.started ? map() : home());
  document.querySelectorAll("[data-game]").forEach(
    (b) =>
      (b.onclick = () => {
        free = true;
        if (["memory", "ttt", "shadow", "part", "odd", "missing", "dobble"].includes(b.dataset.game))
          launch(b.dataset.game, null);
        else speech(() => launch(b.dataset.game, null));
      }),
  );
}
function launch(id, ctx = null, options = {}) {
  context = ctx;
  pending = { id, options };
  sound();
  const run = {
    memory,
    odd: oddOneOut,
    missing: missingPicture,
    dobble,
    shadow: () => picturePuzzle("shadow"),
    part: () => picturePuzzle("part"),
    ttt,
    race,
    maze,
    assembly,
    route,
    diff,
    detective,
    conveyor,
    traffic,
    guess,
  }[id];
  run(options);
}
function finish(extra = 0) {
  cleanup();
  cleanup = () => {};
  W.frame(() => {});
  if (finalStage) {
    if (finalStage === 1) {
      finalStage = 2;
      modal(
        "Отличный заезд!",
        "<p>Теперь собери машину в чемпионском пит-стопе.</p>",
        [["В мастерскую", () => assembly()]],
      );
    } else if (finalStage === 2) {
      finalStage = 3;
      modal("Машина готова!", "<p>Осталось пересечь финишную линию.</p>", [
        ["К финишу", () => race({ variant: "delivery", finalSprint: true })],
      ]);
    } else {
      finalStage = 0;
      state.wins++;
      save();
      victory();
    }
    return;
  }
  reward(10 + extra + (context?.bonus || 0));
}
function reward(amount, title = "Здорово! Ещё одна победа", icon = "🏅") {
  const ctx = context;
  let repeated = ctx && state.completed.includes(ctx.id);
  if (!repeated) {
    state.coins += amount;
    if (icon === "⭐" || icon === "🌟") {
      state.stickers ||= [];
      if (!state.stickers.includes(icon)) state.stickers.push(icon);
    }
    if (ctx) {
      state.completed.push(ctx.id);
      if (
        ctx.checkpoint !== undefined &&
        !state.cups.includes(ctx.checkpoint)
      ) {
        state.cups.push(ctx.checkpoint);
        state.decor.push(ctx.checkpoint);
        icon = "🏆";
        title = "Деталь кубка твоя!";
      }
    }
    save();
  }
  if(ctx?.circuit){
    const run=state.circuitRun;
    if(run && run.id===ctx.runId){if(!run.pitDone.includes(ctx.stopIndex))run.pitDone.push(ctx.stopIndex);run.pendingActivity=null;save();}
    grandPrix();return;
  }
  if (ctx?.labyrinth) {
    const bonus =
      !repeated && ctx.checkpoint === undefined
        ? ` · +${OPTIONAL_POINTS} очков`
        : "";
    map({ reward: `+${repeated ? 0 : amount} монет${bonus}` });
    return;
  }
  if (ctx?.drive) {
    state.journey.pending = null;
    state.journey.distance = ctx.resumeDistance ?? ctx.distance;
    save();
    map({
      reward:
        ctx.checkpoint !== undefined
          ? `🏆 Деталь кубка · +${repeated ? 0 : amount} монет`
          : `Задание выполнено · +${repeated ? 0 : amount} монет`,
    });
    return;
  }
  modal(
    title,
    `<div class="reward-icon">${icon}</div><p>${repeated ? "Награда за эту остановку уже получена." : `+${amount} монет${ctx?.checkpoint !== undefined ? " · новое украшение открыто" : ""}`}</p><p class="muted">${esc(state.name)}, Турбо гордится твоим старанием!</p>`,
    [
      [
        ctx?.drive
          ? "Продолжить поездку"
          : state.started
            ? "Вернуться на карту"
            : "Выбрать мини-игру",
        () => (state.started ? map() : library()),
      ],
    ],
  );
}
function startFinal() {
  if (state.cups.length < 5) return;
  state.roaming = false;
  save();
  finalStage = 1;
  context = null;
  modal(
    "Чемпионский заезд 🏁",
    "<p>Три шага к кубку: гонка с соперниками, пит-стоп и финишная прямая.</p>",
    [["На старт", () => race({ variant: "cup" })]],
  );
}
function victory() {
  base(
    "victory",
    `<main class="screen panel center"><span class="eyebrow">ЧЕМПИОН ФЕСТИВАЛЯ</span><div class="reward-icon">🏆</div><h1>${esc(state.name)}, кубок твой!</h1><p class="muted">Пять районов позади. Столько открытий впереди!</p><div class="stats"><div class="stat"><strong>5 / 5</strong>деталей кубка</div><div class="stat"><strong>${state.coins}</strong>монет</div><div class="stat"><strong>${labyrinthBonus(state)}</strong>бонусных очков</div><div class="stat"><strong>${state.wins}</strong>чемпионских побед</div></div><div class="controls"><button class="primary" id="roam">Продолжить кататься</button><button class="secondary" id="mini">Выбрать мини-игру</button><button class="secondary" id="new">Новое приключение</button></div></main>`,
  );
  $("#roam").onclick = () => {
    state.roaming = true;
    save();
    map();
  };
  $("#mini").onclick = library;
  $("#new").onclick = () =>
    modal(
      "Начать новое приключение?",
      "<p>Награды и маршрут будут сброшены.</p>",
      [
        ["Начать", setup],
        ["Отмена", () => {}, "secondary"],
      ],
    );
}
function memory() {
  page(
    "Найди пару в гараже",
    "",
    `<div class="memory-round-bar"><span id="memory-round" class="badge" aria-live="polite"></span><span id="pairs" class="badge"></span><button class="secondary small" id="restart">Сначала</button></div><div class="board memory" id="cards"></div><div id="memory-round-end" class="memory-round-end" hidden><strong id="memory-round-result"></strong><button class="primary" id="memory-next-round">Следующий раунд →</button></div>`,
  );
  $(".screen").classList.add("memory-screen");
  let round = 0,
    selected = [],
    matched = 0,
    locked = false,
    timeout;
  const draw = () => {
    clearTimeout(timeout);
    selected = [];
    matched = 0;
    locked = false;
    const pairs = MEMORY_ROUNDS[round],
      pictures = memoryPictures(state.settings, pairs),
      deck = shuffled([...pictures, ...pictures]);
    $("#memory-round").textContent =
      `Раунд ${round + 1} из ${MEMORY_ROUNDS.length} · ${pairs} пар`;
    $("#pairs").textContent = `Найдено: 0 из ${pairs}`;
    $("#cards").innerHTML = "";
    $("#cards").dataset.round = String(round + 1);
    $("#memory-round-end").hidden = true;
    deck.forEach((item, i) => {
      const b = btn(
        "",
        () => {
          if (
            locked ||
            b.classList.contains("open") ||
            b.classList.contains("matched")
          )
            return;
          b.classList.add("open");
          b.querySelector(".memory-front").setAttribute("aria-hidden", "false");
          b.setAttribute("aria-label", item.word);
          selected.push({ b, item });
          if (selected.length < 2) return;
          locked = true;
          if (selected[0].item.id === selected[1].item.id) {
            selected.forEach((x) => x.b.classList.add("matched"));
            matched++;
            $("#pairs").textContent = `Найдено: ${matched} из ${pairs}`;
            selected = [];
            if (matched === pairs) {
              timeout = setTimeout(() => {
                if (round === MEMORY_ROUNDS.length - 1) finish();
                else {
                  $("#memory-round-result").textContent =
                    `Раунд ${round + 1} пройден!`;
                  $("#memory-next-round").textContent =
                    `Раунд ${round + 2} · ${MEMORY_ROUNDS[round + 1]} пар →`;
                  $("#memory-round-end").hidden = false;
                  $("#memory-next-round").focus();
                }
              }, 550);
            } else locked = false;
          } else
            timeout = setTimeout(() => {
              selected.forEach((x) => {
                x.b.classList.remove("open");
                x.b.setAttribute("aria-label", "Закрытая карточка");
                x.b
                  .querySelector(".memory-front")
                  .setAttribute("aria-hidden", "true");
              });
              selected = [];
              locked = false;
            }, 950);
        },
        "card memory-card",
      );
      b.innerHTML = `<span class="memory-inner"><span class="memory-back" aria-hidden="true"><span class="memory-checker"></span></span><span class="memory-front" aria-hidden="true">${photo(item, state.settings.captions)}</span></span>`;
      b.setAttribute("aria-label", `Закрытая карточка ${i + 1}`);
      $("#cards").append(b);
    });
  };
  $("#restart").onclick = () => {
    round = 0;
    draw();
  };
  $("#memory-next-round").onclick = () => {
    if (
      locked &&
      matched === MEMORY_ROUNDS[round] &&
      round < MEMORY_ROUNDS.length - 1
    ) {
      round++;
      draw();
    }
  };
  cleanup = () => clearTimeout(timeout);
  draw();
}

function dobble() {
  page('Доббль', 'Найди общий предмет на двух карточках. Назови и нажми на него.',
    '<div class="dobble-status"><span class="badge" id="dobble-round"></span><button class="secondary small" id="dobble-restart">Заново</button></div><div class="dobble-board" id="dobble-board"></div><p class="center dobble-feedback" id="dobble-feedback" role="status" aria-live="polite"></p>');
  $('.screen').classList.add('dobble-game');
  let rounds, index, locked, timer, disposed = false;
  const draw = () => {
    locked = false;
    const round = rounds[index];
    $('#dobble-round').textContent = `Раунд ${index + 1} из ${rounds.length}`;
    $('#dobble-feedback').textContent = '';
    $('#dobble-board').innerHTML = '';
    round.cards.forEach((items, side) => {
      const card = document.createElement('section');
      card.className = 'dobble-card';
      card.setAttribute('aria-label', `Карточка ${side + 1}`);
      const layout = dobbleLayout(items.length);
      items.forEach((item, i) => {
        const button = btn('', () => {
          if (locked || disposed) return;
          if (item.id !== round.common) {
            $('#dobble-feedback').textContent = 'Найди предмет, который есть на обеих карточках';
            return;
          }
          locked = true;
          $('#dobble-board').querySelectorAll('button').forEach(b => {
            b.disabled = true;
            if (b.dataset.picture === round.common) b.classList.add('dobble-found');
          });
          $('#dobble-feedback').textContent = `Верно! ${item.word}`;
          sound(700);
          timer = setTimeout(() => {
            if (disposed) return;
            index++;
            if (index === rounds.length) finish();
            else draw();
          }, 900);
        }, 'dobble-object');
        const position = layout[i];
        button.style.left = position.x + '%';
        button.style.top = position.y + '%';
        button.style.width = position.size + '%';
        button.style.height = position.size + '%';
        button.style.setProperty('--rotation', position.rotation + 'deg');
        button.innerHTML = photo(item, state.settings.captions);
        button.setAttribute('aria-label', item.word);
        button.dataset.picture = item.id;
        card.append(button);
      });
      $('#dobble-board').append(card);
    });
  };
  const restart = () => {
    clearTimeout(timer);
    rounds = dobbleRounds(memoryPictures(state.settings, 17), state.settings.difficulty);
    index = 0;
    draw();
  };
  $('#dobble-restart').onclick = restart;
  cleanup = () => { disposed = true; clearTimeout(timer); };
  restart();
}

function oddOneOut(){
 page('Четвёртый лишний','Найди и назови лишний предмет.', '<span class="badge" id="extra-round"></span><div class="odd-field" id="extra-choices"></div><p class="center" id="extra-feedback" role="status"></p>');
 const pictures=new Map(memoryPictures(state.settings,17).map(item=>[item.id,item]));
 const rounds=oddRounds();let index=0,locked=false,timer;
 const draw=()=>{
  locked=false;const r=rounds[index];$('#extra-round').textContent=`${index+1} из ${rounds.length}`;
  $('#extra-feedback').textContent='';$('#extra-choices').innerHTML='';
  const count=r.choices.length;
  $('#extra-choices').style.setProperty('--odd-columns',count===10?5:count%4===0?4:3);
  $('#extra-choices').style.setProperty('--odd-mobile-columns',count%3===0?3:2);
  for(const item of r.choices){const b=btn('',()=>{if(locked)return;if(item.id!==r.odd){$('#extra-feedback').textContent='Посмотри ещё раз';return}locked=true;$('#extra-feedback').textContent='Верно!';sound(700);timer=setTimeout(()=>{index++;if(index===rounds.length)finish();else draw()},700)},'odd-object');b.innerHTML=photo(pictures.get(item.id)||item,state.settings.captions);b.dataset.answer=item.id===r.odd?'correct':'other';$('#extra-choices').append(b)}
 };cleanup=()=>clearTimeout(timer);draw();
}
function missingPicture(){
 page('Что пропало?','Запомни три картинки. Потом найди пропавшую.', '<span class="badge" id="extra-round"></span><div id="missing-shown" class="missing-shown"></div><div class="controls"><button id="missing-hide" class="primary">Запомнил →</button></div><p class="center" id="missing-instruction"></p><div class="picture-choices" id="extra-choices"></div><p class="center" id="extra-feedback" role="status"></p>');
 const pictures=new Map(memoryPictures(state.settings,17).map(item=>[item.id,item]));
 let index=0,round,locked=false,timer;
 const show=()=>{
  round=missingRound();locked=false;$('#extra-round').textContent=`${index+1} из 3`;$('#extra-feedback').textContent='';$('#missing-instruction').textContent='Назови и запомни картинки';$('#extra-choices').innerHTML='';$('#missing-hide').hidden=false;
  $('#missing-shown').innerHTML=round.shown.map(item=>`<div class="missing-card">${photo(pictures.get(item.id)||item,state.settings.captions)}</div>`).join('');
 };
 $('#missing-hide').onclick=()=>{
  if($('#missing-hide').hidden)return;$('#missing-hide').hidden=true;
  $('#missing-shown').children[round.missing].innerHTML='<span class="missing-placeholder" aria-label="Пропавшая картинка">?</span>';
  $('#missing-instruction').textContent='Какая картинка пропала? Назови и выбери.';
  for(const item of round.choices){const b=btn('',()=>{if(locked)return;if(item.id!==round.answer.id){$('#extra-feedback').textContent='Попробуй ещё';return}locked=true;b.classList.add('correct');$('#missing-shown').children[round.missing].innerHTML=photo(pictures.get(item.id)||item,state.settings.captions);$('#extra-feedback').textContent=`Верно! ${item.word}`;sound(700);timer=setTimeout(()=>{index++;if(index===3)finish();else show()},700)},'picture-choice');b.dataset.answer=item.id===round.answer.id?'correct':'other';b.innerHTML=photo(pictures.get(item.id)||item,state.settings.captions);$('#extra-choices').append(b)}
 };
 cleanup=()=>clearTimeout(timer);show();
}

function picturePuzzle(kind) {
  const shadow = kind === "shadow";
  page(
    shadow ? "Найди тень" : "Найди часть",
    shadow
      ? "Какому предмету принадлежит тень?"
      : "От какого предмета этот фрагмент?",
    '<span class="badge" id="picture-round"></span><div id="picture-target" class="picture-target"></div><div id="picture-choices" class="picture-choices"></div><p id="picture-feedback" class="center" role="status"></p>',
  );
  if(!shadow){
    $('.screen').classList.add('fragment-game');
    const layout=document.createElement('div');layout.className='fragment-layout';
    $('#picture-target').before(layout);layout.append($('#picture-target'),$('#picture-choices'));
  }
  const pool = shuffled(WORDS),
    targets = (
      shadow
        ? pool
        : pool.filter((item) => !["rama", "kran", "komar"].includes(item.id))
    ).slice(0, 8);
  const totalRounds=shadow?5:8;
  let pictureGeneration=0;
  let round = 0,
    locked = false,
    timer;
  const draw = () => {
    locked = false;
    const target = targets[round];
    $("#picture-round").textContent = `${round + 1} из ${totalRounds}`;
    $("#picture-feedback").textContent = "";
    $("#picture-target").className =
      "picture-target " + (shadow ? "silhouette" : "fragment");
    const generation=++pictureGeneration;
    if(shadow)$('#picture-target').innerHTML=photo({...target,word:'Тень предмета'},false);
    else {
      $('#picture-target').innerHTML='<canvas role="img" aria-label="Увеличенный фрагмент предмета"></canvas>';
      const canvas=$('#picture-target canvas'),image=new Image();
      image.onload=()=>{if(generation!==pictureGeneration)return;paintFragment(canvas,image,round);$('#picture-choices').querySelectorAll('button').forEach(b=>b.disabled=false);if(round>0)canvas.scrollIntoView({block:'nearest',behavior:'instant'});};
      image.src=import.meta.env.BASE_URL+'images/watercolor/'+target.id+'.png';
    }
    const choices=shadow?shuffled([target,...shuffled(pool.filter(w=>w.id!==target.id)).slice(0,3)]):fragmentChoices(target,pool,6);
    $("#picture-choices").innerHTML = "";
    for (const item of choices) {
      const b = btn(
        "",
        () => {
          if (locked) return;
          if (item.id !== target.id) {
            $("#picture-feedback").textContent = "Посмотри ещё раз";
            return;
          }
          locked = true;
          b.classList.add("correct");
          $("#picture-feedback").textContent = "Верно! " + target.word;
          sound(720);
          timer = setTimeout(() => {
            round++;
            if (round === totalRounds) finish();
            else draw();
          }, 800);
        },
        "picture-choice",
      );
      if(!shadow)b.disabled=true;
      b.dataset.answer = item.id === target.id ? "correct" : "other";
      b.innerHTML = photo(item, state.settings.captions);
      $("#picture-choices").append(b);
    }
  };
  cleanup = () => {pictureGeneration++;clearTimeout(timer)};
  draw();
}

function ttt() {
  page(
    "Крестики-нолики",
    "Три раунда. Называй картинку и ставь свой знак.",
    `<div class="row"><select id="duel-mode"><option value="ai">Против Турбо</option><option value="two">Ученик против логопеда</option></select><button class="secondary small" id="duel-reset">Заново</button></div><div class="duel-players"><label>× Ученик<input id="student-name" maxlength="24" value="${esc(state.settings.studentName || (state.name === "Гонщик" ? "Ученик" : state.name))}"></label><label>○ Логопед<input id="teacher-name" maxlength="24" value="${esc(state.settings.teacherName || "Логопед")}"></label></div><p id="score" class="center" aria-live="polite"></p><div class="board ttt" id="ttt"></div><div id="round-result" class="center"></div>`,
  );
  let cells,
    turn,
    round = 1,
    scores = [0, 0],
    locked = false,
    timer;
  let pictures = shuffled(material(state.settings));
  const icons = ["×", "○"];
  const names = () => [
    $("#student-name").value.trim() || "Ученик",
    $("#duel-mode").value === "ai"
      ? "Турбо"
      : $("#teacher-name").value.trim() || "Логопед",
  ];
  const showScore = () => {
    $("#score").textContent =
      `Раунд ${round} / 3 · ${names()[0]} ${scores[0]} : ${scores[1]} ${names()[1]} · Ход: ${names()[turn]}`;
    $("#ttt").setAttribute("aria-label", "Ход: " + names()[turn]);
  };
  const lines = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  const draw = () => {
    pictures = shuffled(material(state.settings));
    cells = Array(9).fill(null);
    turn = 0;
    locked = false;
    $("#round-result").innerHTML = "";
    $("#score").textContent =
      `Раунд ${round} / 3 · × ${scores[0]} : ${scores[1]} ○ · Ход ×`;
    $("#ttt").innerHTML = "";
    cells.forEach((_, i) =>
      $("#ttt").append(
        btn(
          "",
          () => {
            if (locked || cells[i] !== null) return;
            play(i);
          },
          "",
        ),
      ),
    );
    [...$("#ttt").children].forEach((b, i) => {
      b.innerHTML = photo(
        pictures[i % pictures.length],
        state.settings.captions,
      );
      b.setAttribute("aria-label", pictures[i % pictures.length].word);
    });
    showScore();
  };
  const play = (i) => {
    if (cells[i] !== null) return;
    cells[i] = turn;
    const cell=$('#ttt').children[i],mark=document.createElement('span');
    mark.className='duel-mark '+(turn===0?'mark-x':'mark-o');mark.textContent=icons[turn];mark.setAttribute('aria-hidden','true');
    cell.append(mark);cell.classList.add('occupied');cell.dataset.player=String(turn);
    cell.setAttribute('aria-label',pictures[i%pictures.length].word+' — '+(turn===0?'крестик':'нолик')+', '+names()[turn]);cell.setAttribute('aria-disabled','true');
    sound();
    const win = lines.find((l) => l.every((i) => cells[i] === turn));
    if (win || cells.every((c) => c !== null)) {
      locked = true;
      if (win) {
        scores[turn]++;
        win.forEach((i) => $("#ttt").children[i].classList.add("win"));
      }
      $("#score").textContent =
        `Раунд ${round} / 3 · × ${scores[0]} : ${scores[1]} ○`;
      $("#round-result").textContent = win
        ? `${icons[turn]} ${names()[turn]} — победа в раунде!`
        : "Ничья — отличный поединок!";
      $("#round-result").append(
        btn(
          round === 3 ? "Завершить дуэль" : "Следующий раунд",
          () => {
            if (round === 3) finish();
            else {
              round++;
              draw();
            }
          },
          "primary small",
        ),
      );
      return;
    }
    turn = 1 - turn;
    $("#score").textContent =
      `Раунд ${round} / 3 · × ${scores[0]} : ${scores[1]} ○ · Ход ${icons[turn]}`;
    showScore();
    if (turn === 1 && $("#duel-mode").value === "ai") {
      locked = true;
      timer = setTimeout(() => {
        let empty = cells
          .map((v, i) => (v === null ? i : -1))
          .filter((i) => i >= 0);
        let target = empty.find((i) =>
          lines.some(
            (l) =>
              l.includes(i) && l.filter((j) => cells[j] === 1).length === 2,
          ),
        );
        if (target === undefined)
          target = empty[Math.floor(Math.random() * empty.length)];
        locked = false;
        play(target);
      }, 650);
    }
  };
  $("#duel-mode").value = state.settings.remoteLesson ? "two" : "ai";
  $("#teacher-name").onchange = () => {
    state.settings.teacherName = $("#teacher-name").value.trim();
    save();
    showScore();
  };
  $("#student-name").onchange = () => {
    state.settings.studentName = $("#student-name").value.trim();
    save();
    showScore();
  };
  $("#duel-mode").onchange = () => {
    clearTimeout(timer);
    round = 1;
    scores = [0, 0];
    draw();
  };
  $("#duel-reset").onclick = $("#duel-mode").onchange;
  cleanup = () => clearTimeout(timer);
  draw();
}
function race(options = {}) {
  if (!options.variant && !options.finalSprint) {
    page(
      "Настоящие мини-гонки",
      "Стрелки / WASD или большие кнопки. Столкновения только замедляют.",
      `<div class="grid games">${[
        ["fuel", "⛽", "Собери топливо", "Собери 5 канистр до финиша"],
        ["delivery", "🔧", "Доставка в гараж", "Довези деталь до финиша"],
        ["cup", "🏆", "Гонка за кубком", "Обгони двух соперников"],
      ]
        .map(
          ([id, icon, n, s]) =>
            `<button class="game-card" data-race="${id}"><span>${icon}</span><b>${n}</b><p>${s}</p></button>`,
        )
        .join("")}</div>`,
    );
    document
      .querySelectorAll("[data-race]")
      .forEach((b) => (b.onclick = () => race({ variant: b.dataset.race })));
    return;
  }
  if (state.settings.speech && !options.prepared) {
    speech(
      () => race({ ...options, prepared: true }),
      null,
      null,
      "Перед стартом",
    );
    return;
  }
  const variant = options.variant || "delivery",
    easy = options.easy || state.settings.difficulty === "easy",
    duration = options.finalSprint ? 12 : state.settings.duration;
  let elapsed = 0,
    x = 0,
    progress = 0,
    fuel = 0,
    coins = 0,
    hits = 0,
    boost = 0,
    slow = 0,
    paused = false,
    ended = false,
    keys = {},
    seen = new Set(),
    rivalProgress = [0, 0],
    pitSpeech = false;
  base(
    "race",
    `<div class="race-hud"><div class="pill" id="race-goal"></div><div class="pill" id="race-time"></div><div class="pill" id="race-place"></div><button class="secondary small" id="pause">Ⅱ Пауза</button><button class="secondary small" id="exit-race">На карту</button></div><div class="race-caption">${options.finalSprint ? "Финишная прямая!" : variant === "fuel" ? "Собери 5 зелёных канистр" : variant === "delivery" ? "Деталь на борту. Довези её до финиша!" : "Обгони две машинки и возьми кубок!"} · стрелки / WASD</div>${roadLegend("race", variant)}<div class="race-controls"><button class="control" data-key="ArrowLeft" aria-label="Влево">◀</button><button class="control" data-key="ArrowUp" aria-label="Ускориться">▲</button><button class="control" data-key="ArrowDown" aria-label="Тормоз">▼</button><button class="control" data-key="ArrowRight" aria-label="Вправо">▶</button></div>`,
    "race",
  );
  W.configureRace(variant);
  if (state.settings.remoteLesson)
    $(".race-caption").textContent +=
      " · Нажимай стрелки щелчками: ◀ ▶ — смена полосы, ▲ ▼ — переключение скорости";
  const pause = () => {
    paused = true;
    keys = {};
    modal("Пауза", "<p>Можно передохнуть. Трасса подождёт.</p>", [
      [
        "Продолжить",
        () => {
          paused = false;
        },
      ],
      ["На карту", returnMap, "secondary"],
    ]);
  };
  $("#pause").onclick = pause;
  $("#exit-race").onclick = returnMap;
  const down = (e) => {
    if (modalClose || ended) return;
    if (
      [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "a",
        "d",
        "w",
        "s",
        "A",
        "D",
        "W",
        "S",
        " ",
        "Escape",
      ].includes(e.key)
    ) {
      e.preventDefault();
      if ((e.key === "Escape" || e.key === " ") && !paused) pause();
      else keys[e.key.toLowerCase()] = true;
    }
  };
  const up = (e) => (keys[e.key.toLowerCase()] = false);
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  const blur = () => {
    if (!paused && !ended && screen === "race") pause();
  };
  window.addEventListener("blur", blur);
  const vis = () => {
    if (document.hidden) blur();
  };
  document.addEventListener("visibilitychange", vis);
  document.querySelectorAll("[data-key]").forEach((b) => {
    b.onclick = () => {
      if (!state.settings.remoteLesson || paused || ended || modalClose) return;
      const k = b.dataset.key;
      // The chase camera faces +Z, so screen-left is world +X.
      if (k === "ArrowLeft") x = Math.min(2.6, x + 2.6);
      else if (k === "ArrowRight") x = Math.max(-2.6, x - 2.6);
      else {
        const key = k.toLowerCase();
        keys[key] = !keys[key];
        keys[k === "ArrowUp" ? "arrowdown" : "arrowup"] = false;
        document
          .querySelectorAll("[data-key]")
          .forEach((control) =>
            control.setAttribute(
              "aria-pressed",
              !!keys[control.dataset.key.toLowerCase()],
            ),
          );
      }
    };
    b.onpointerdown = (e) => {
      if (state.settings.remoteLesson) return;
      e.preventDefault();
      b.setPointerCapture(e.pointerId);
      keys[b.dataset.key.toLowerCase()] = true;
    };
    b.onpointerup =
      b.onpointercancel =
      b.onlostpointercapture =
        () => {
          if (!state.settings.remoteLesson)
            keys[b.dataset.key.toLowerCase()] = false;
        };
  });
  cleanup = () => {
    ended = true;
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    document.removeEventListener("visibilitychange", vis);
    W.frame(() => {});
  };
  W.frame((dt) => {
    if (paused || ended || modalClose) return;
    elapsed += dt;
    boost = Math.max(0, boost - dt);
    slow = Math.max(0, slow - dt);
    const left = keys.arrowleft || keys.a,
      right = keys.arrowright || keys.d,
      gas = keys.arrowup || keys.w,
      brake = keys.arrowdown || keys.s;
    x = Math.max(
      -3.25,
      Math.min(3.25, x + ((left ? 1 : 0) - (right ? 1 : 0)) * dt * 5),
    );
    let speed =
      (gas ? 1.25 : 1) *
      (brake ? 0.5 : 1) *
      (slow ? 0.45 : 1) *
      (boost ? 1.55 : 1);
    progress += ((dt * 100) / duration) * speed;
    rivalProgress[0] += ((dt * 100) / duration) * (easy ? 0.65 : 0.88);
    rivalProgress[1] += ((dt * 100) / duration) * (easy ? 0.7 : 0.93);
    if (
      state.settings.speech &&
      !pitSpeech &&
      progress >= 48 &&
      !options.finalSprint
    ) {
      pitSpeech = true;
      paused = true;
      keys = {};
      speech(
        () => {
          paused = false;
        },
        null,
        state.settings.material === "phrases"
          ? "Повтори словосочетание три раза"
          : "Добавь слово-признак",
        "Речевой пит-стоп",
      );
      return;
    }
    const objects = W.raceVisual(x, progress, rivalProgress);
    for (const o of objects || []) {
      const cycle = Math.floor(progress / 100),
        key = cycle + "-" + o.userData.index;
      if (
        !seen.has(key) &&
        Math.abs(o.position.z) < 0.8 &&
        Math.abs(o.position.x - x) < (o.userData.kind === "boost" ? 1.3 : 0.85)
      ) {
        seen.add(key);
        if (o.userData.kind === "fuel") {
          fuel++;
          sound(740);
        }
        if (o.userData.kind === "coin") {
          coins++;
          sound(850);
        }
        if (o.userData.kind === "cone") {
          hits++;
          slow = easy ? 0.5 : 1.2;
          sound(180);
        }
        if (o.userData.kind === "boost") {
          boost = 2;
          sound(1000);
        }
        o.visible = false;
      } else if (o.position.z > 4 && !seen.has(key)) o.visible = true;
    }
    $("#race-goal").textContent =
      variant === "fuel"
        ? `⛽ ${fuel} / ${easy ? 3 : 5}`
        : variant === "delivery"
          ? `🔧 Деталь на борту · 🪙 ${coins}`
          : `🏁 ${Math.max(1, 1 + rivalProgress.filter((p) => p > progress).length)} место · 🪙 ${coins}`;
    $("#race-time").textContent = state.settings.timers
      ? `⏱ ${Math.max(0, Math.ceil(duration - elapsed))} с`
      : `Трасса: ${Math.min(100, Math.floor(progress))}%`;
    $("#race-place").textContent = boost
      ? "⚡ Ускорение"
      : slow
        ? "Кочка! Едем дальше"
        : `Финиш: ${Math.min(100, Math.floor(progress))}%`;
    const success =
      progress >= 100 &&
      (variant !== "fuel" || fuel >= (easy ? 3 : 5)) &&
      (variant !== "cup" || progress >= Math.max(...rivalProgress));
    if (success) {
      ended = true;
      W.frame(() => {});
      speech(
        () => finish(Math.min(10, coins)),
        null,
        state.settings.material === "phrases"
          ? "Повтори словосочетание"
          : "Составь предложение",
        "После финиша",
      );
      return;
    }
    const timedOut = state.settings.timers && elapsed >= duration + 3;
    const endedFuel =
      progress >= 115 && variant === "fuel" && fuel < (easy ? 3 : 5);
    if (
      timedOut ||
      endedFuel ||
      (progress >= 100 &&
        variant === "cup" &&
        rivalProgress.some((p) => p > progress))
    ) {
      ended = true;
      W.frame(() => {});
      modal(
        "Ещё один заезд?",
        "<p>Турбо верит в тебя. Можно повторить или выбрать облегчённый режим.</p>",
        [
          ["Повторить", () => race(options)],
          ["Облегчённый режим", () => race({ ...options, easy: true })],
          ["На карту", returnMap, "secondary"],
        ],
      );
    }
  });
}
const mazeRows = [
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
export function mazePath(start, goal, rows = mazeRows) {
  const q = [[start]],
    seen = new Set([start.join(",")]);
  while (q.length) {
    const p = q.shift(),
      [x, y] = p.at(-1);
    if (x === goal[0] && y === goal[1]) return p;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const n = [x + dx, y + dy],
        k = n.join(",");
      if (rows[n[1]]?.[n[0]] === "." && !seen.has(k)) {
        seen.add(k);
        q.push([...p, n]);
      }
    }
  }
  return [];
}
function maze() {
  page(
    "Доберись до заправки",
    "Собери три канистры и приезжай на ⛽. Стрелки или WASD.",
    `<div class="row"><span id="fuel-count" class="badge">Канистры: 0 / 3</span><button class="secondary small" id="hint">Показать путь</button></div><div class="board maze" id="maze" style="grid-template-columns:repeat(11,1fr)"></div><div class="controls"><button class="control" data-dir="-1,0">◀</button><button class="control" data-dir="0,-1">▲</button><button class="control" data-dir="0,1">▼</button><button class="control" data-dir="1,0">▶</button></div>`,
  );
  let pos = [1, 1],
    canisters = [
      [9, 1],
      [1, 9],
      [7, 5],
    ],
    collected = 0,
    hints = [],
    timer;
  const goal = [9, 9];
  const draw = () => {
    $("#maze").innerHTML = mazeRows
      .map((row, y) =>
        [...row]
          .map(
            (c, x) =>
              `<div class="${c === "#" ? "wall" : hints.some((p) => p[0] === x && p[1] === y) ? "hint" : ""}">${pos[0] === x && pos[1] === y ? "🚗" : canisters.some((p) => p[0] === x && p[1] === y) ? "🛢️" : x === 9 && y === 9 ? "⛽" : ""}</div>`,
          )
          .join(""),
      )
      .join("");
    $("#fuel-count").textContent = `Канистры: ${collected} / 3`;
  };
  const move = (dx, dy) => {
    if (modalClose) return;
    const p = [pos[0] + dx, pos[1] + dy];
    if (mazeRows[p[1]]?.[p[0]] !== ".") return;
    pos = p;
    const i = canisters.findIndex((c) => c[0] === p[0] && c[1] === p[1]);
    if (i >= 0) {
      canisters.splice(i, 1);
      collected++;
      sound();
    }
    draw();
    if (pos[0] === 9 && pos[1] === 9) {
      if (collected === 3) finish();
      else toast("Сначала собери все три канистры");
    }
  };
  const key = (e) => {
    const d = {
      ArrowLeft: [-1, 0],
      a: [-1, 0],
      ArrowRight: [1, 0],
      d: [1, 0],
      ArrowUp: [0, -1],
      w: [0, -1],
      ArrowDown: [0, 1],
      s: [0, 1],
    }[e.key];
    if (d) {
      e.preventDefault();
      move(...d);
    }
  };
  window.addEventListener("keydown", key);
  document
    .querySelectorAll("[data-dir]")
    .forEach(
      (b) => (b.onclick = () => move(...b.dataset.dir.split(",").map(Number))),
    );
  $("#hint").onclick = () => {
    const dest = canisters[0] || goal;
    hints = mazePath(pos, dest).slice(1, 5);
    draw();
    clearTimeout(timer);
    timer = setTimeout(() => {
      hints = [];
      draw();
    }, 2200);
  };
  cleanup = () => {
    window.removeEventListener("keydown", key);
    clearTimeout(timer);
  };
  draw();
}
function assembly() {
  page(
    "Пит-стоп: собери автомобиль",
    "Перетащи деталь или нажми «деталь → место».",
    `<div class="parts" id="parts"></div><div class="assembly" id="assembly"><div class="car-body" style="--car:${state.color}"></div></div><p class="center muted" id="part-status">Выбери деталь</p>`,
  );
  const items = [
    ["Колёса", "🛞", 15, 65],
    ["Фары", "💡", 76, 52],
    ["Руль", "🎮", 48, 21],
    ["Спойлер", "🏁", 13, 24],
    ["Капот", "🔧", 67, 25],
  ];
  let selected = null,
    placed = new Set(),
    timer;
  const put = (i) => {
    if (selected === null) {
      toast("Сначала выбери деталь");
      return;
    }
    if (selected !== i) {
      toast("Попробуй другое место");
      selected = null;
      document
        .querySelectorAll(".part")
        .forEach((b) => b.classList.remove("active"));
      return;
    }
    placed.add(i);
    const slot = $(`[data-slot="${i}"]`);
    slot.textContent = items[i][1];
    slot.classList.add("filled");
    $(`[data-part="${i}"]`).disabled = true;
    selected = null;
    $("#part-status").textContent = `Готово: ${placed.size} из 5`;
    sound();
    if (placed.size === 5) {
      $("#assembly").classList.add("drive");
      sound(160);
      timer = setTimeout(() => finish(), 1600);
    }
  };
  items.forEach(([name, icon, x, y], i) => {
    let b = btn(
      `${icon} ${name}`,
      () => {
        selected = i;
        document
          .querySelectorAll(".part")
          .forEach((p) => p.classList.toggle("active", p === b));
        $("#part-status").textContent =
          `Куда поставить: ${name.toLowerCase()}?`;
      },
      "part choice",
    );
    b.dataset.part = i;
    b.draggable = true;
    b.ondragstart = (e) => {
      selected = i;
      e.dataTransfer.setData("text/plain", String(i));
    };
    $("#parts").append(b);
    let s = btn(name, () => put(i), "slot");
    s.dataset.slot = i;
    s.style.left = x + "%";
    s.style.top = y + "%";
    s.style.fontSize = "12px";
    s.setAttribute("aria-label", "Место: " + name);
    s.ondragover = (e) => e.preventDefault();
    s.ondrop = (e) => {
      e.preventDefault();
      selected = Number(e.dataTransfer.getData("text/plain"));
      if (!placed.has(selected)) put(i);
    };
    $("#assembly").append(s);
  });
  cleanup = () => clearTimeout(timer);
}
function route() {
  page(
    "Запомни картинки",
    "Запомни картинки. Назови их и нажми в том же порядке.",
    `<p class="center" id="route-status" aria-live="polite"></p><p class="center muted" id="route-progress"></p><div class="landmarks" id="landmarks"></div><div class="controls"><button class="secondary" id="replay">Показать ещё раз</button></div>`,
  );
  $(".screen").classList.add("route-game");
  const landmarks = memoryPictures(state.settings, 5);
  let level = 3,
    seq = [],
    index = 0,
    showing = true,
    timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const show = () => {
    timers.forEach(clearTimeout);
    timers = [];
    showing = true;
    index = 0;
    $("#route-status").textContent =
      `Запомни ${level} ${level === 5 ? "картинок" : "картинки"}`;
    $("#route-progress").textContent = "Смотри";
    [...$("#landmarks").children].forEach((b) => b.classList.remove("lit"));
    $("#replay").disabled = true;
    seq.forEach((n, i) => {
      later(
        () => {
          const card = $("#landmarks").children[n];
          card.querySelector(".route-cue").textContent = String(i + 1);
          card.classList.add("lit");
        },
        400 + i * 900,
      );
      later(
        () => $("#landmarks").children[n].classList.remove("lit"),
        1000 + i * 900,
      );
    });
    later(
      () => {
        showing = false;
        $("#route-status").textContent = "Теперь твоя очередь!";
        $("#replay").disabled = false;
        $("#route-progress").textContent = `Повторено: 0 из ${level}`;
      },
      seq.length * 900 + 500,
    );
  };
  const newRound = () => {
    while (seq.length < level) {
      const choices = landmarks
        .map((_, i) => i)
        .filter((i) => i !== seq.at(-1));
      seq.push(choices[Math.floor(Math.random() * choices.length)]);
    }
    show();
  };
  landmarks.forEach((item, i) => {
    let b = btn(
      "",
      () => {
        if (showing) return;
        b.querySelector(".route-cue").textContent = String(index + 1);
        b.classList.add("lit");
        later(() => b.classList.remove("lit"), 250);
        if (seq[index] === i) {
          index++;
          $("#route-progress").textContent = `Повторено: ${index} из ${level}`;
          sound(500 + i * 80);
          if (index === seq.length) {
            showing = true;
            if (level === 5) later(() => finish(), 500);
            else {
              level++;
              toast("Верно! Ещё чуть длиннее");
              later(newRound, 900);
            }
          }
        } else {
          toast("Посмотрим порядок ещё раз");
          show();
        }
      },
      "landmark",
    );
    b.innerHTML = `${photo(item, state.settings.captions)}<span class="route-cue" aria-hidden="true"></span>`;
    b.setAttribute("aria-label", item.word);
    $("#landmarks").append(b);
  });
  $("#replay").onclick = show;
  cleanup = () => timers.forEach(clearTimeout);
  newRound();
}
function diff() {
  page(
    "Найди отличия",
    "На двух площадках спрятались 5 отличий. Нажимай на них в любой сцене.",
    `<p class="center badge" id="diff-count">Найдено: 0 из 5</p><div class="scene-pair" id="scenes"></div>`,
  );
  let found = new Set();
  const a = ["🚧", "🚗 7", "🏎️", "🏁", "🛞", "🌳", "⛽", "🏠", "🌞"],
    b = ["", "🚗 9", "🏎️ 🛢️", "", "⚙️", "🌳", "⛽", "🏠", "🌞"];
  [a, b].forEach((scene, s) => {
    let div = document.createElement("div");
    div.className = "diff-scene";
    scene.forEach((v, i) => {
      let button = btn(
        v || "·",
        () => {
          if (i >= 5) {
            toast("Здесь всё одинаково");
            return;
          }
          if (found.has(i)) return;
          found.add(i);
          document
            .querySelectorAll(`[data-diff="${i}"]`)
            .forEach((e) => e.classList.add("found"));
          $("#diff-count").textContent = `Найдено: ${found.size} из 5`;
          sound();
          if (found.size === 5) finish();
        },
        "",
      );
      button.dataset.diff = i;
      button.setAttribute(
        "aria-label",
        `Сцена ${s + 1}, предмет ${i + 1}: ${v || "пустое место"}`,
      );
      div.append(button);
    });
    $("#scenes").append(div);
  });
}
const carColors = [
  ["синюю", "#659bc5"],
  ["красную", "#d97563"],
  ["зелёную", "#82a568"],
  ["жёлтую", "#e9b53e"],
];
function detective() {
  page(
    "Дорожный детектив",
    "Прочитай признаки и найди единственную подходящую машинку.",
    `<div class="badge" id="detect-count"></div><h2 id="clue" class="center"></h2><div class="grid cars" id="detect-cars"></div>`,
  );
  let round = 0;
  const draw = () => {
    const data = Array.from({ length: 8 }, (_, i) => ({
      color: i % 4,
      number: i + 1,
      wheel: i % 2 ? "#edd063" : "#313e39",
      sticker: i < 4 ? "⭐" : "⚡",
    }));
    const target = (round * 3 + 2) % 8,
      t = data[target];
    $("#detect-count").textContent = `Задание ${round + 1} из 8`;
    $("#clue").textContent =
      round < 2
        ? `Найди машину с номером ${t.number}`
        : round < 5
          ? `Найди ${carColors[t.color][0]} машину с номером ${t.number}`
          : `Найди ${carColors[t.color][0]} машину с номером ${t.number}, ${t.wheel === "#edd063" ? "жёлтыми" : "тёмными"} колёсами и наклейкой ${t.sticker}`;
    $("#detect-cars").innerHTML = "";
    data
      .sort(() => Math.random() - 0.5)
      .forEach((c) => {
        let b = btn(
          "",
          () => {
            if (c === t) {
              round++;
              sound();
              if (round === 8) finish();
              else draw();
            } else toast("Сверь все признаки. Попробуй ещё!");
          },
          "detect-car",
        );
        b.innerHTML = `<div style="background:${carColors[c.color][1]};border-radius:20px;color:white;padding:10px">🚘 <b>${c.number}</b></div><div class="wheels" style="color:${c.wheel}">● ●</div><small>${c.sticker} ${carColors[c.color][0].replace("ую", "ая")} · № ${c.number}</small>`;
        b.setAttribute(
          "aria-label",
          `${carColors[c.color][0]} машина, номер ${c.number}, ${c.wheel === "#edd063" ? "жёлтые" : "тёмные"} колёса, ${c.sticker}`,
        );
        $("#detect-cars").append(b);
      });
  };
  draw();
}
function conveyor() {
  page(
    "Грузовой конвейер",
    "Назови предмет и определи, где звучит твёрдый Р. В каждом слове один целевой звук.",
    `<div class="row"><span class="badge">Твёрдый Р · один звук в слове</span><button class="secondary small" id="belt-pause">Ⅱ Остановить</button><label>Скорость <input id="speed" type="range" min="1" max="3" value="1"></label><span class="badge" id="cargo-score"></span></div><div class="belt" id="belt"></div><p id="cargo-selected" class="center muted">Выбери предмет и назови его</p><div class="trucks" id="trucks"></div><p class="footer-note">Позицию определяем в слове, а не в словосочетании. В словах «кран», «краб», «груша» Р находится в середине слова.</p>`,
  );
  const items = conveyorMaterial(state.settings);
  let selected = null,
    done = 0,
    paused = false,
    phase = 0;
  const cats = ["начало", "середина", "конец"];
  items.forEach((item, i) => {
    const b = btn(
      "",
      () => {
        const choose = () => {
          selected = i;
          $("#cargo-selected").textContent =
            "Где слышится твёрдый Р? Выбери грузовик.";
          $("#belt")
            .querySelectorAll("button")
            .forEach((e) => e.classList.toggle("selected", e === b));
        };
        speech(
          choose,
          item,
          "Назови предмет. Где в слове твёрдый Р?",
          "Речевой груз",
        );
      },
      "cargo",
    );
    b.innerHTML = photo(item, state.settings.captions);
    b.dataset.cargo = i;
    b.dataset.word = item.word;
    $("#belt").append(b);
  });
  cats.forEach((cat, i) => {
    const b = btn(
      "",
      () => {
        if (selected === null) return toast("Сначала назови предмет на ленте");
        const item = items[selected];
        if (item.position !== cat)
          return toast("Послушай слово ещё раз. Попробуй другой грузовик.");
        $(`[data-cargo="${selected}"]`).remove();
        selected = null;
        done++;
        sound();
        $("#cargo-selected").textContent = "Отлично! Выбери следующий предмет";
        $("#cargo-score").textContent = `Готово: ${done} / ${items.length}`;
        if (done === items.length) finish();
      },
      "",
    );
    b.dataset.category = cat;
    b.innerHTML = `<span class="truck-shape">${["Р ● ●", "● Р ●", "● ● Р"][i]}</span><b>${["Начало слова", "Середина слова", "Конец слова"][i]}</b>`;
    $("#trucks").append(b);
  });
  $("#cargo-score").textContent = `Готово: 0 / ${items.length}`;
  $("#belt-pause").onclick = () => {
    paused = !paused;
    $("#belt-pause").textContent = paused ? "▶ Продолжить" : "Ⅱ Остановить";
  };
  const timer = setInterval(() => {
    if (paused || modalClose) return;
    phase += +$("#speed").value * 0.6;
    const belt = $("#belt");
    if (!belt) return;
    belt.scrollLeft = phase;
    if (belt.scrollLeft >= belt.scrollWidth - belt.clientWidth - 1) phase = -20;
  }, 50);
  cleanup = () => clearInterval(timer);
}

function traffic() {
  page(
    "Светофор",
    "Удерживай «Ехать» или пробел на зелёный ▶. На красный ■ отпусти. Жёлтый — приготовься.",
    `<div class="traffic"><div class="lights"><div class="light red" id="red">■</div><div class="light yellow" id="yellow">Ⅱ</div><div class="light green" id="green">▶</div></div></div><p class="center" id="traffic-signal" aria-live="polite"></p><div class="traffic-road"><div id="traffic-track"><span class="traffic-start-label">СТАРТ</span><span class="traffic-finish">ФИНИШ</span><div class="traffic-toy-car" id="traffic-car" style="--traffic-car:${state.color}" aria-label="Твоя машинка"><span></span></div></div></div><div class="progress"><div id="traffic-progress" style="width:0%"></div></div><p class="center" id="traffic-status"></p><div class="controls"><button class="primary" id="traffic-start">Начать</button><button class="primary" id="drive" disabled>▶ Ехать (удерживай)</button><button class="secondary" id="traffic-pause">Ⅱ Пауза</button></div>`,
  );
  $(".screen").classList.add("traffic-game");
  $(".material-toolbar")?.remove();
  let started = false;
  let elapsed = 0,
    distance = 0,
    signal = "red",
    until = 2,
    holding = false,
    paused = false,
    penalty = 0,
    phase = 0,
    redGrace = 0;
  const duration = 30;
  const updateSignal = () => {
    for (const s of ["red", "yellow", "green"])
      $("#" + s).classList.toggle("on", signal === s);
    $("#traffic-signal").textContent =
      signal === "red"
        ? "■ Стой"
        : signal === "yellow"
          ? "Ⅱ Приготовься"
          : "▶ Можно ехать";
  };
  updateSignal();
  const down = (e) => {
    if (e.code === "Space") {
      if (!started || modalClose || paused) return;
      e.preventDefault();
      holding = true;
    }
  };
  const up = (e) => {
    if (e.code === "Space") holding = false;
  };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  $("#drive").onclick = () => {
    if (!started || !state.settings.remoteLesson || paused || modalClose)
      return;
    holding = !holding;
    $("#drive").textContent = holding ? "■ Остановиться" : "▶ Ехать";
    $("#drive").setAttribute("aria-pressed", holding);
  };
  if (state.settings.remoteLesson) {
    $("#drive").textContent = "▶ Ехать";
    document.querySelector(".screen-head .muted").textContent =
      "Зелёный — нажми «Ехать». Жёлтый — приготовься остановиться. Красный — нажми «Остановиться».";
  }
  $("#drive").onpointerdown = (e) => {
    if (!started || paused || modalClose || state.settings.remoteLesson) return;
    e.preventDefault();
    $("#drive").setPointerCapture(e.pointerId);
    holding = true;
  };
  $("#drive").onpointerup =
    $("#drive").onpointercancel =
    $("#drive").onlostpointercapture =
      () => {
        if (!state.settings.remoteLesson) holding = false;
      };
  $("#traffic-start").onclick = () => {
    started = true;
    $("#traffic-start").hidden = true;
    $("#drive").disabled = false;
    $("#drive").focus();
    updateSignal();
  };
  $("#traffic-status").textContent = "Доезжай до финиша, соблюдая сигналы";
  $("#traffic-pause").onclick = () => {
    paused = true;
    holding = false;
    modal("Пауза", "<p>Светофор ждёт.</p>", [
      ["Продолжить", () => (paused = false)],
    ]);
  };
  const blur = () => {
    holding = false;
    paused = true;
    if (screen === "game" && !modalClose)
      modal("Пауза", "<p>Продолжим?</p>", [
        ["Продолжить", () => (paused = false)],
      ]);
  };
  window.addEventListener("blur", blur);
  W.frame((dt) => {
    if (state.settings.remoteLesson) {
      $("#drive").textContent = holding ? "■ Остановиться" : "▶ Ехать";
      $("#drive").setAttribute("aria-pressed", holding);
    }
    if (!started || paused || modalClose) return;
    elapsed += dt;
    until -= dt;
    penalty = Math.max(0, penalty - dt);
    redGrace = Math.max(0, redGrace - dt);
    if (until <= 0) {
      phase = (phase + 1) % 4;
      signal = ["red", "yellow", "green", "yellow"][phase];
      redGrace = signal === "red" ? 0.45 : 0;
      until =
        signal === "yellow"
          ? 1.4
          : signal === "green"
            ? 3 + Math.random() * 2
            : 2 + Math.random() * 2;
      updateSignal();
    }
    if (holding && signal === "green") distance += dt * 8;
    if (holding && signal === "red" && penalty <= 0 && redGrace <= 0) {
      distance = Math.max(0, Math.floor(distance / 20) * 20);
      penalty = 1;
      toast("Красный: остановись у ближайшей отметки");
    }
    $("#traffic-progress").style.width = Math.min(100, distance) + "%";
    $("#traffic-car").style.left = Math.min(100, distance) + "%";
    $("#traffic-car").classList.toggle(
      "driving",
      holding && signal === "green",
    );
    $("#traffic-status").textContent =
      `${state.settings.timers ? "Осталось: " + Math.max(0, Math.ceil(duration - elapsed)) + " с · " : ""}Путь: ${Math.floor(distance)}%`;
    if (distance >= 100) {
      W.frame(() => {});
      finish();
    } else if (elapsed >= duration) {
      elapsed = 0;
      toast("Продолжай до финиша — на зелёный");
    }
  });
  cleanup = () => {
    window.removeEventListener("keydown", down);
    window.removeEventListener("keyup", up);
    window.removeEventListener("blur", blur);
    W.frame(() => {});
  };
}
function guess() {
  page(
    "Угадай, что в гараже",
    "Открывай панели. Назови предмет — логопед подтвердит ответ.",
    `<p class="center badge" id="guess-progress"></p><div class="hidden-picture"><span id="secret"></span><div class="shutters" id="shutters"></div></div><div class="controls"><button class="primary" id="guessed">Угадал ✓</button><button class="secondary" id="guess-next">Другой предмет</button></div><p class="center muted">Ранний ответ — дополнительная монета. Можно открыть все панели.</p>`,
  );
  const pictures = shuffled(material(state.settings));
  let n = 0,
    opened = 0;
  const draw = () => {
    opened = 0;
    $("#secret").innerHTML = photo(pictures[n], false);
    $("#guess-progress").textContent = "Открыто: 0 из 6";
    $("#shutters").innerHTML = "";
    for (let i = 0; i < 6; i++)
      $("#shutters").append(
        btn(
          String(i + 1),
          () => {
            const b = $("#shutters").children[i];
            if (b.classList.contains("revealed")) return;
            b.classList.add("revealed");
            opened++;
            $("#guess-progress").textContent = `Открыто: ${opened} из 6`;
          },
          "",
        ),
      );
  };
  $("#guessed").onclick = () =>
    modal(
      "Ответ логопеду",
      `${photo(pictures[n], state.settings.captions)}<details><summary>Подсказка логопеду</summary>${pictures[n].word}</details><p class="muted">Оцените ответ ребёнка. Продолжение — после вашего подтверждения.</p>`,
      [
        ["Дальше", () => finish(opened < 4 ? 1 : 0)],
        ["Открыть ещё", () => {}, "secondary"],
      ],
    );
  $("#guess-next").onclick = () => {
    n = (n + 1) % pictures.length;
    draw();
  };
  draw();
}

function garage(after) {
  const returnTo = typeof after === "function" ? after : () => map();
  base(
    "garage",
    `<main class="screen panel"><div class="screen-head"><div><span class="eyebrow">ТВОЯ МАСТЕРСКАЯ</span><h1>Маленькие детали. Большой характер.</h1><p class="muted">Украшения меняют внешний вид. Все машины остаются одинаково быстрыми.</p></div><button class="secondary small" id="back">На карту</button></div><div class="assembly"><div class="car-body" id="preview" style="--car:${state.color}"><span style="font-size:30px">${state.style.sticker ? "⭐" : ""}</span></div></div><h3>Перекрасить · бесплатно</h3><div class="choices" id="paint"></div><h3>Украшения за монеты</h3><div class="grid games" id="upgrades"></div><h3>Полка наград</h3><p>${(state.stickers || []).map((x) => `<span class="badge">${x} Наклейка</span>`).join("")}${state.cups.map((_, i) => `<span class="badge">🏆 Деталь ${i + 1}</span>`).join("") || "Скоро здесь появится первая деталь кубка."}</p><p class="muted">Завершено остановок: ${state.completed.length} · Чемпионских побед: ${state.wins}</p></main>`,
  );
  $("#back").onclick = returnTo;
  colors.forEach((c) => {
    const b = btn(
      "",
      () => {
        state.color = c;
        save();
        garage(returnTo);
      },
      "swatch" + (c === state.color ? " active" : ""),
    );
    b.style.background = c;
    b.setAttribute("aria-label", "Перекрасить в " + c);
    $("#paint").append(b);
  });
  [
    ["wheels", "🛞 Жёлтые диски", 15, 0],
    ["sticker", "⭐ Наклейка", 10, 1],
    ["spoiler", "🏁 Спойлер", 20, 2],
    ["mint", "💠 Мятные диски", 15, 3],
    ["star", "👑 Золотой стиль", 25, 4],
  ].forEach(([id, label, price, unlock]) => {
    const owned = state.decor.includes(id),
      unlocked = (state.raceBest || 0) >= [0, 40, 75, 100, 120][unlock];
    let b = btn(
      "",
      () => {
        if (!unlocked)
          return toast(`Нужно ${[0, 40, 75, 100, 120][unlock]} очков за гонку`);
        if (!owned) {
          if (state.coins < price)
            return toast("Пока не хватает монет. Они ждут тебя в мини-играх!");
          state.coins -= price;
          state.decor.push(id);
        }
        if (id === "wheels" || id === "mint" || id === "star")
          state.style.wheels =
            state.style.wheels === (id === "mint" ? "#7ec7b1" : "#e8c35a")
              ? null
              : id === "mint"
                ? "#7ec7b1"
                : "#e8c35a";
        else state.style[id] = !state.style[id];
        save();
        sound();
        garage(returnTo);
      },
      "game-card",
    );
    b.innerHTML = `<b>${label}</b><p class="muted">${!unlocked ? `🔒 От ${[0, 40, 75, 100, 120][unlock]} очков` : owned ? "В коллекции · нажми, чтобы изменить" : `${price} 🪙 · приобрести`}</p>`;
    $("#upgrades").append(b);
  });
}
function settings() {
  finalStage = 0;
  base(
    "settings",
    `<main class="screen panel"><div class="screen-head"><div><span class="eyebrow">ДЛЯ ЛОГОПЕДА • ТВЁРДЫЙ Р</span><h1>Занятие в вашем ритме</h1></div><button class="secondary small" id="back">${state.started ? "На карту" : "В меню"}</button></div>
 <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))"><section>
 <label class="field"><span><input type="checkbox" id="warmup" style="width:auto"> Артикуляционная разминка перед поездкой</span></label><label class="field"><span><input type="checkbox" id="remoteLesson" style="width:auto"> Ученик и логопед · управление через Zoom</span></label><label class="field">Сложность<select id="difficulty"><option value="easy">Облегчённая</option><option value="normal">Обычная</option></select></label>
 <label class="field">Длительность гонок<select id="duration"><option value="40">40 секунд</option><option value="45">45 секунд</option><option value="60">60 секунд</option></select></label>
 <label class="field"><span><input type="checkbox" id="timers" style="width:auto"> Показывать таймеры и ограничивать гонки по времени</span></label>
 <label class="field"><span><input type="checkbox" id="speech" style="width:auto"> Речевые остановки с подтверждением</span></label>
 <p class="muted">Произношение оценивает логопед. Продолжение — кнопкой «Дальше». При речевой остановке гонка полностью приостанавливается.</p></section>
 <section><label class="field">Материал<select id="material"><option value="words">Слова</option><option value="phrases">Словосочетания</option></select></label>
 <label class="field">Набор<select id="speechGroup"><option value="все">Все наборы</option><option value="начало">Р в начале слова</option><option value="середина">Р в середине слова</option><option value="конец">Р в конце слова</option><option value="стечения">Р в стечениях согласных</option></select></label>
 <label class="field"><span><input type="checkbox" id="captions" style="width:auto"> Показывать подписи под картинками</span></label>
 <label class="field">Речевое задание<select id="speechType">${TASKS.map((t, i) => `<option value="${i}">${t}</option>`).join("")}</select></label>
 <label class="field">Выбрать слова из готовой коллекции<textarea id="words" maxlength="10000" placeholder="шар&#10;краб&#10;гора"></textarea></label><p class="muted">По одному слову или словосочетанию на строку. Пустой список — весь выбранный набор. Используются только слова с готовым изображением и проверенным твёрдым Р; остальные строки не попадают в задания.</p></section>
 <section><label class="field">Конвейер: слово|позиция<textarea id="conveyorWords" maxlength="10000" placeholder="ракета|начало&#10;корова|середина&#10;шар|конец"></textarea></label><p class="muted">Пустой список — готовый набор. Категории проверяются по словарю. В каждом слове ровно один Р. «Кран», «краб», «груша» — середина слова; «трактор» исключён: два Р.</p><div id="word-validation" class="speech-status"></div></section></div>
 <details class="settings-catalog"><summary>Готовая коллекция: 17 слов и 8 словосочетаний</summary><div class="speech-gallery">${GROUPS.map(
   (g) =>
     `<div class="catalog-group">${g === "стечения" ? "В стечениях согласных" : "В " + (g === "начало" ? "начале" : g === "конец" ? "конце" : "середине") + " слова"}</div>${WORDS.filter(
       (x) => x.group === g,
     )
       .map((x) => `<div class="catalog-item">${photo(x, true)}</div>`)
       .join("")}`,
 ).join(
   "",
 )}<div class="catalog-group">Словосочетания</div>${PHRASES.map((x) => `<div class="catalog-item">${photo(x, true)}</div>`).join("")}</div></details>
 <div class="controls"><button class="primary" id="save-settings">Сохранить настройки</button><button class="secondary" id="choose-game">Запустить мини-игру</button><button class="danger" id="reset">Сбросить прогресс</button></div></main>`,
  );
  const keys = [
    "warmup",
    "remoteLesson",
    "difficulty",
    "duration",
    "timers",
    "speech",
    "material",
    "speechGroup",
    "captions",
    "speechType",
    "words",
    "conveyorWords",
  ];
  keys.forEach((k) => {
    const el = $("#" + k);
    if (el.type === "checkbox") el.checked = state.settings[k];
    else el.value = state.settings[k];
  });
  const validate = () => {
    const all = [...WORDS, ...PHRASES],
      rows = $("#words")
        .value.split("\n")
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean);
    const unknown = rows.filter((w) => !all.some((x) => x.word === w));
    const cr = $("#conveyorWords")
        .value.split("\n")
        .map((x) => x.trim())
        .filter(Boolean),
      bad = cr.filter((row) => {
        const [w, p] = row
          .toLowerCase()
          .split("|")
          .map((x) => x.trim());
        return !WORDS.some(
          (x) => x.word === w && x.position === p && x.count === 1,
        );
      });
    $("#word-validation").textContent =
      unknown.length || bad.length
        ? `Не используются: ${unknown.length} строк списка слов, ${bad.length} строк конвейера. Нужны готовые изображения и проверенные категории.`
        : "Все заполненные строки соответствуют готовому словарю.";
  };
  $("#words").oninput = $("#conveyorWords").oninput = validate;
  validate();
  const persist = () => {
    keys.forEach((k) => {
      const el = $("#" + k);
      state.settings[k] =
        el.type === "checkbox"
          ? el.checked
          : ["duration", "speechType"].includes(k)
            ? +el.value
            : el.value;
    });
    state.settings.soundTarget = "Р";
    save();
    validate();
  };
  $("#save-settings").onclick = () => {
    persist();
    toast("Настройки сохранены");
  };
  $("#back").onclick = () => {
    persist();
    state.started ? map() : home();
  };
  $("#choose-game").onclick = () => {
    persist();
    library();
  };
  $("#reset").onclick = () =>
    modal(
      "Сбросить прогресс?",
      "<p>Маршрут, монеты и украшения будут удалены. Настройки логопеда сохранятся.</p>",
      [
        [
          "Сбросить",
          () => {
            const settings = state.settings;
            state = { ...defaults(), settings };
            save();
            finalStage = 0;
            home();
          },
        ],
        ["Отмена", () => {}, "secondary"],
      ],
    );
}

W.init();
home();
