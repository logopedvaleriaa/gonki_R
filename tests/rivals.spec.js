import { test, expect } from '@playwright/test';
import { stepRivals } from '../src/rivals.js';
import { stepDriving } from '../src/driving.js';

function race(distances = [8, 16]) {
  const motion = { pace: 18, speeds: [0, 0] };
  let rivals = distances, distance = 0;
  return {
    motion,
    get gaps() { return rivals.map(d => d - distance); },
    get place() { return 1 + rivals.filter(d => d > distance).length; },
    tick(speed, seconds, difficulty = 'normal', speedLimit = () => 42) {
      for (let t = 0; t < seconds - .001; t += .02) {
        const advance = speed * .02;
        distance += advance;
        const previous = rivals;
        const speeds = [...motion.speeds];
        rivals = stepRivals(rivals, motion, {
          playerDistance: distance, playerAdvance: advance, difficulty, speedLimit,
        }, .02);
        rivals.forEach((d, i) => {
          expect(d).toBeGreaterThanOrEqual(previous[i]);
          expect(d - previous[i]).toBeLessThanOrEqual(.85);
          expect(Math.abs(motion.speeds[i] - speeds[i])).toBeLessThanOrEqual(.121);
        });
      }
    },
  };
}

test('Соперники не уезжают от остановившегося ученика на целый круг', () => {
  const r = race();
  r.tick(0, 30);
  expect(r.gaps[0]).toBeLessThan(40);
  expect(r.gaps[1]).toBeLessThan(48);
  r.tick(30, 15);
  expect(r.place).toBe(1);
});

test('Быстрая езда позволяет обгонять, остановка теряет позиции, разгон возвращает их', () => {
  const r = race();
  r.tick(30, 15);
  expect(r.place).toBe(1);
  r.tick(0, 10);
  expect(r.place).toBe(3);
  r.tick(30, 20);
  expect(r.place).toBe(1);
});

test('На газе обычной физики можно пройти обе машины, на тормозе они обгоняют', () => {
  const motion = { pace: 18, speeds: [0, 0] };
  const car = { speed: 0, lateral: 0, heading: 0, yaw: 0, slip: 0, steer: 0 };
  let rivals = [8, 16], distance = 0;
  const drive = (gas, brake, seconds) => {
    for (let i = 0; i < seconds * 50; i++) {
      const movement = stepDriving(car, { gas, brake }, .02);
      distance += movement.advance;
      rivals = stepRivals(rivals, motion, {
        playerDistance: distance, playerAdvance: movement.advance, speedLimit: () => 42,
      }, .02);
    }
  };
  drive(true, false, 6);
  expect(rivals.every(d => d < distance)).toBe(true);
  drive(false, true, 10);
  expect(car.speed).toBe(0);
  expect(rivals.every(d => d > distance)).toBe(true);
});

test('Старый большой отрыв сокращается без переноса машин назад', () => {
  const r = race([250, 300]);
  r.tick(30, 20);
  expect(r.place).toBe(1);
});

test('Облегчённый режим оставляет больше времени на обгон; в поворотах ИИ тормозит', () => {
  const normal = race(), easy = race();
  normal.tick(24, 15);
  easy.tick(24, 15, 'easy');
  expect(easy.gaps[0]).toBeLessThan(normal.gaps[0]);
  normal.tick(24, 8, 'normal', () => 24);
  expect(normal.motion.speeds.every(s => s <= 24 * .98 + .01)).toBe(true);
});
