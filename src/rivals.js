import { clamp } from './driving.js';

// Rivals drive real metres. A rolling pace and a gentle lead limit keep the
// race accessible without moving cars instantly or inventing a finishing place.
export function stepRivals(distances, motion, input, dt) {
  if (dt <= 0) return distances;
  const easy = input.difficulty === 'easy';
  const progressSpeed = Math.max(0, input.playerAdvance / dt);
  motion.pace += (progressSpeed - motion.pace) * (1 - Math.exp(-dt / 5));
  return distances.map((distance, i) => {
    const gap = distance - input.playerDistance;
    const cruise = clamp(motion.pace * (easy ? .84 : .9) + .2 + i * .9,
      easy ? 10 : 12, (easy ? 30 : 36) + i);
    const catchUp = clamp((-gap - 10) * .12, 0, easy ? 4 : 6);
    const leadLimit = (easy ? 30 : 38) + i * 8;
    // Slow smoothly when ahead; a stationary learner can always catch up.
    // An old save with a large gap is recovered by waiting, never teleporting.
    const leadSpeed = Math.max(0, (leadLimit - gap) * .65);
    const cornerSpeed = Math.min(input.speedLimit(distance),
      input.speedLimit(distance + motion.speeds[i] * 1.2)) * (easy ? .88 : .98);
    const target = Math.min(cruise + catchUp, leadSpeed, cornerSpeed);
    const change = clamp(target - motion.speeds[i], -6 * dt, 4.5 * dt);
    const speed = Math.max(0, motion.speeds[i] + change);
    // Integrate speed, preserving continuous motion under acceleration/braking.
    const advance = (motion.speeds[i] + speed) * .5 * dt;
    motion.speeds[i] = speed;
    return distance + advance;
  });
}
