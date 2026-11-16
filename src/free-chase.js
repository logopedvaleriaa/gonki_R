import { stepRivals } from './rivals.js';

export function createFreeChase(distance, total) {
  const remaining = total - distance;
  return {
    at: remaining > 180 ? distance + Math.min(90 + Math.random() * 90, remaining - 100) : null,
    distances: [],
    motion: { pace: 18, speeds: [0, 0] },
  };
}

// Distance triggers the surprise only while driving; pausing never advances it.
export function stepFreeChase(chase, input, dt) {
  if (dt <= 0 || chase.at === null) return false;
  let arrived = false;
  if (!chase.distances.length && input.playerDistance >= chase.at) {
    if (input.total - input.playerDistance < 80) return false;
    chase.distances = [input.playerDistance + 28, input.playerDistance + 40];
    const speed = Math.min(24, input.playerAdvance / dt * .8);
    chase.motion = { pace: Math.max(12, speed), speeds: [speed, speed] };
    arrived = true;
  }
  if (chase.distances.length) {
    chase.distances = stepRivals(chase.distances, chase.motion, input, dt);
    chase.place = 1 + chase.distances.filter(d => d > input.playerDistance).length;
  }
  return arrived;
}
