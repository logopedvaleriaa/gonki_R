import { test, expect } from "@playwright/test";
import { stepDriving, clamp } from "../src/driving.js";
const car = () => ({
  lateral: 0,
  speed: 30,
  heading: 0,
  yaw: 0,
  slip: 0,
  steer: 0,
});
test("Без руля машина не следует повороту автоматически", () => {
  const s = car();
  for (let i = 0; i < 100; i++) stepDriving(s, { curvature: 0.012 }, 0.02);
  expect(Math.abs(s.lateral)).toBeGreaterThan(4);
});
test("Правильное руление удерживает машину в повороте", () => {
  const s = car();
  for (let i = 0; i < 300; i++) {
    const angle = clamp(0.24 - s.speed * 0.003, 0.105, 0.24);
    const steer = clamp(
      (Math.atan(0.012 * 2.7) - (s.heading + s.slip) * 0.45 - s.lateral * 0.012) / angle,
      -1,
      1,
    );
    stepDriving(s, { curvature: 0.012, steer }, 0.02);
  }
  expect(Math.abs(s.lateral)).toBeLessThan(2);
});
test("На скорости резкий руль вызывает занос, тормоз снижает скорость", () => {
  const s = car();
  let drift = false;
  for (let i = 0; i < 70; i++)
    drift = stepDriving(s, { steer: 1, gas: true }, 0.02).drifting || drift;
  expect(drift).toBe(true);
  for (let i = 0; i < 80; i++) stepDriving(s, { brake: true }, 0.02);
  expect(s.speed).toBeLessThan(10);
});

test('Без нажатия газа разгона нет, отпускание газа и тормоз замедляют',()=>{const s={lateral:0,speed:0,heading:0,yaw:0,slip:0,steer:0};for(let i=0;i<300;i++)stepDriving(s,{},.02);expect(s.speed).toBe(0);for(let i=0;i<150;i++)stepDriving(s,{gas:true},.02);const speed=s.speed;expect(speed).toBeGreaterThan(15);for(let i=0;i<100;i++)stepDriving(s,{},.02);expect(s.speed).toBeLessThan(speed);for(let i=0;i<300;i++)stepDriving(s,{brake:true},.02);expect(s.speed).toBe(0);});
