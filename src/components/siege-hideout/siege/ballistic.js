/**
 * Shared ballistic helpers for Siege Run player shots (sim + render preview).
 * Canvas Y+ is downward — gravity is positive.
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

/** Shortest signed delta from a → b (radians). */
export function angleDelta(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Map pointer (relative to muzzle) → launch angle + speed.
 * Power scales with distance from muzzle (Angry Birds–like strength feel).
 */
export function launchFromPointer(muzzleX, muzzleY, pointerX, pointerY, mods = {}) {
  const dx = pointerX - muzzleX;
  const dy = pointerY - muzzleY;
  const dist = Math.hypot(dx, dy);
  // Always launch into the forward half-plane (castle sits on the left).
  const aimDx = Math.max(dx, 28);
  const maxUp = (-72 * Math.PI) / 180;
  const maxDown = (55 * Math.PI) / 180;
  const angle = Math.max(maxUp, Math.min(maxDown, Math.atan2(dy, aimDx)));

  const t = clamp(dist / PLAYER_WEAPON.aimDistanceRef, 0, 1);
  // Ease-out so mid-range feels meaty
  const eased = 1 - (1 - t) * (1 - t);
  const base =
    PLAYER_WEAPON.minLaunchSpeed +
    eased * (PLAYER_WEAPON.maxLaunchSpeed - PLAYER_WEAPON.minLaunchSpeed);
  const speed = base * (mods.projSpeedMul || 1);
  return { angle, speed, powerT: eased };
}

export function velocityFromLaunch(angle, speed) {
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

/**
 * Integrate a ballistic path with the same Euler step as the sim.
 * @returns {{ x: number, y: number }[]}
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
