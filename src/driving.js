// Bicycle steering in road coordinates: heading is relative to the road, not an autopilot.
export const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export function stepDriving(s, input, dt) {
  const {
    steer = 0,
    gas = false,
    brake = false,
    curvature = 0,
    corner = 42,
  } = input;
  const offroad = Math.abs(s.lateral) > 5.2;
  const grip = offroad ? 1.8 : brake ? 7 : 4;
  const angle = steer * clamp(0.24 - s.speed * 0.003, 0.105, 0.24);
  s.steer += (angle - s.steer) * Math.min(1, dt * 8);
  const limit = Math.min(40, corner * 1.08) * (offroad ? .48 : 1);
  if(brake) s.speed=Math.max(0,s.speed-12*dt);
  else if(gas){
    s.speed=s.speed<limit?Math.min(limit,s.speed+7*dt):Math.max(limit,s.speed-5*dt);
  }else s.speed=Math.max(0,s.speed-(.6+.003*s.speed*s.speed)*dt);
  const yaw = (s.speed / 2.7) * Math.tan(s.steer);
  s.yaw += (yaw - s.yaw) * Math.min(1, dt * grip);
  const slide = clamp(-s.yaw * Math.max(0, s.speed - 20) * 0.016, -0.3, 0.3);
  s.slip += (slide - s.slip) * Math.min(1, dt * (brake ? 7 : 3));
  const advance = s.speed * Math.max(0.4, Math.cos(s.heading + s.slip)) * dt;
  s.heading = clamp(s.heading + s.yaw * dt - curvature * advance, -0.8, 0.8);
  s.lateral += s.speed * Math.sin(s.heading + s.slip) * dt;
  let impact = false;
  if (Math.abs(s.lateral) > 7.35) {
    s.lateral = clamp(s.lateral, -7.35, 7.35);
    s.heading *= -0.35;
    s.slip *= 0.4;
    s.speed *= 0.6;
    impact = true;
  }
  return {
    advance,
    offroad,
    impact,
    drifting: Math.abs(s.slip) > 0.075 && s.speed > 22,
  };
}
