/**
 * Shared ballistic helpers for Siege Run player shots (sim + render preview).
 * Canvas Y+ is downward — gravity is positive.
 *
 * Player aim solves a lob that **passes through the mouse** (exact analytical hit),
 * so the dotted preview endpoint sticks to the OS cursor.
 */

import { CASTLE, PLAYER_WEAPON } from "./configs/weapons.js";

export function getPlayerMuzzle() {
  return {
    x: CASTLE.anchor.x + PLAYER_WEAPON.muzzleOffset.x,
    y: CASTLE.anchor.y + PLAYER_WEAPON.muzzleOffset.y,
  };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

/** Closed-form ballistic pose at time t (matches preview + player bolts). */
export function ballisticAt(x0, y0, vx0, vy0, gravity, t) {
  return {
    x: x0 + vx0 * t,
    y: y0 + vy0 * t + 0.5 * gravity * t * t,
    vx: vx0,
    vy: vy0 + gravity * t,
  };
}

/**
 * Solve launch so the parabola passes through the pointer.
 * y = y0 + vy·t + ½g·t²  (Y+ down) → unique (vx, vy) for a chosen flight time.
 */
export function launchFromPointer(muzzleX, muzzleY, pointerX, pointerY, mods = {}) {
  const g = PLAYER_WEAPON.gravity;
  const speedMul = mods.projSpeedMul || 1;

  // Keep a minimum forward reach so on/behind-muzzle aims stay solvable.
  const hitX = Math.max(pointerX, muzzleX + 20);
  const hitY = pointerY;
  const dx = hitX - muzzleX;
  const dy = hitY - muzzleY;
  const dist = Math.hypot(dx, dy);

  const preferred = PLAYER_WEAPON.arcPreferredSpeed * speedMul;
  let t = clamp(dist / Math.max(1, preferred), PLAYER_WEAPON.arcMinFlightT, PLAYER_WEAPON.arcMaxFlightT);

  let vx = dx / t;
  let vy = (dy - 0.5 * g * t * t) / t;
  let speed = Math.hypot(vx, vy);

  // Stretch flight time if over max speed (still hits the same cursor point).
  const maxSpeed = PLAYER_WEAPON.maxLaunchSpeed * speedMul;
  if (speed > maxSpeed) {
    let lo = t;
    let hi = Math.max(t, PLAYER_WEAPON.arcMaxFlightT * 1.85);
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) * 0.5;
      const sx = dx / mid;
      const sy = (dy - 0.5 * g * mid * mid) / mid;
      if (Math.hypot(sx, sy) > maxSpeed) lo = mid;
      else hi = mid;
    }
    t = hi;
    vx = dx / t;
    vy = (dy - 0.5 * g * t * t) / t;
    speed = Math.hypot(vx, vy);
  }

  const angle = Math.atan2(vy, vx);
  const powerT = clamp(
    (speed / speedMul - PLAYER_WEAPON.minLaunchSpeed) /
      Math.max(1, PLAYER_WEAPON.maxLaunchSpeed - PLAYER_WEAPON.minLaunchSpeed),
    0,
    1,
  );

  return {
    angle,
    speed,
    vx,
    vy,
    flightT: t,
    powerT,
    hitX,
    hitY,
  };
}

/** @deprecated Prefer launch.vx/vy from launchFromPointer (cursor-hit lob). */
export function velocityFromLaunch(angle, speed) {
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

/**
 * Analytical arc samples from muzzle through the hit point (last sample = cursor).
 * @returns {{ x: number, y: number }[]}
 */
export function sampleArcThroughHit(x0, y0, vx, vy, gravity, flightT, opts = {}) {
  const dots = opts.dots ?? 22;
  const points = [];
  const tHit = Math.max(1e-4, flightT);
  for (let i = 0; i <= dots; i++) {
    const t = (tHit * i) / dots;
    const p = ballisticAt(x0, y0, vx, vy, gravity, t);
    points.push({ x: p.x, y: p.y });
  }
  return points;
}

/**
 * Legacy Euler sampler (tower / debug). Prefer sampleArcThroughHit for player aim.
 */
export function sampleBallisticArc(x0, y0, vx0, vy0, gravity, opts = {}) {
  const dt = opts.dt ?? 1 / 60;
  const maxSteps = opts.maxSteps ?? 90;
  const maxX = opts.maxX ?? 980;
  const maxY = opts.maxY ?? 420;
  const minY = opts.minY ?? -40;
  const points = [];
  let x = x0;
  let y = y0;
  let vx = vx0;
  let vy = vy0;
  for (let i = 0; i < maxSteps; i++) {
    points.push({ x, y });
    vy += gravity * dt;
    x += vx * dt;
    y += vy * dt;
    if (x > maxX || x < -20 || y > maxY || y < minY) break;
  }
  return points;
}
