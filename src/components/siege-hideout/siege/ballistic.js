/**
 * Shared ballistic helpers for Siege Run player shots (sim + render preview).
 * Canvas Y+ is downward — gravity is positive.
 *
 * Player aim solves a lob that **passes through the mouse**.
 * Distance morphs the lob continuously:
 *   near  → denser bell (higher lob, more samples near apex)
 *   far   → longer flatter arc (shallower, stretched — no sudden top-lob jump)
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

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Smooth Hermite 0→1 (no hard corners). */
function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
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

function velocityForHit(dx, dy, g, t) {
  const tt = Math.max(1e-4, t);
  return {
    vx: dx / tt,
    vy: (dy - 0.5 * g * tt * tt) / tt,
  };
}

/**
 * Continuous distance → shape: 0 near castle (bell), 1 far (flat stretch).
 */
export function aimDistNorm(dist) {
  const near = PLAYER_WEAPON.arcNearDist;
  const far = PLAYER_WEAPON.arcFarDist;
  return smoothstep((dist - near) / Math.max(1, far - near));
}

/**
 * Ideal flight time before speed soft-cap.
 * Near: slower travel + higher lob mul → tall bell.
 * Far: faster travel + ~1 lob mul → shallow extended arc.
 */
function idealFlightTime(dist, distNorm, speedMul) {
  const travel = lerp(
    PLAYER_WEAPON.arcSpeedNear,
    PLAYER_WEAPON.arcSpeedFar,
    distNorm,
  ) * speedMul;
  const lobMul = lerp(PLAYER_WEAPON.arcLobNear, PLAYER_WEAPON.arcLobFar, distNorm);
  const tMax = lerp(PLAYER_WEAPON.arcMaxFlightTNear, PLAYER_WEAPON.arcMaxFlightTFar, distNorm);
  let t = (dist / Math.max(1, travel)) * lobMul;
  return clamp(t, PLAYER_WEAPON.arcMinFlightT, tMax);
}

/**
 * Softly raise t until launch speed ≤ max (iterative, continuous — no binary cliff).
 * Far shots barely stretch (keep flat); near may stretch a bit more for a readable bell.
 */
function softenToMaxSpeed(dx, dy, g, tIdeal, maxSpeed, distNorm) {
  let tt = tIdeal;
  const stretchCap = tIdeal * lerp(1.4, 1.1, distNorm);
  for (let i = 0; i < 8; i++) {
    const { vx, vy } = velocityForHit(dx, dy, g, tt);
    const speed = Math.hypot(vx, vy);
    if (speed <= maxSpeed || !Number.isFinite(speed)) break;
    const over = speed / maxSpeed;
    tt *= 1 + (over - 1) * lerp(0.5, 0.28, distNorm);
    if (tt >= stretchCap) {
      tt = stretchCap;
      break;
    }
  }
  return Math.min(tt, stretchCap);
}

/**
 * Solve launch so the parabola passes through the pointer.
 * Shape (bell ↔ flat) morphs smoothly with muzzle→mouse distance.
 */
export function launchFromPointer(muzzleX, muzzleY, pointerX, pointerY, mods = {}) {
  const g = PLAYER_WEAPON.gravity;
  const speedMul = mods.projSpeedMul || 1;

  const hitX = Math.max(pointerX, muzzleX + 20);
  const hitY = pointerY;
  const dx = hitX - muzzleX;
  const dy = hitY - muzzleY;
  const dist = Math.hypot(dx, dy);
  const distNorm = aimDistNorm(dist);

  let t = idealFlightTime(dist, distNorm, speedMul);
  const maxSpeed =
    lerp(PLAYER_WEAPON.maxLaunchSpeedNear, PLAYER_WEAPON.maxLaunchSpeedFar, distNorm) *
    speedMul;
  t = softenToMaxSpeed(dx, dy, g, t, maxSpeed, distNorm);

  const { vx, vy } = velocityForHit(dx, dy, g, t);
  const speed = Math.hypot(vx, vy);
  const angle = Math.atan2(vy, vx);
  const powerT = clamp(
    (speed / speedMul - PLAYER_WEAPON.minLaunchSpeed) /
      Math.max(
        1,
        lerp(PLAYER_WEAPON.maxLaunchSpeedNear, PLAYER_WEAPON.maxLaunchSpeedFar, distNorm) -
          PLAYER_WEAPON.minLaunchSpeed,
      ),
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
    dist,
    distNorm,
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
 * Sample us in [0,1] with optional density peak at apex (near-castle bell).
 */
function sampleTimeFractions(count, apexU, apexBias) {
  const out = [];
  const a = clamp(apexU, 0.02, 0.98);
  const bias = clamp(apexBias, 0, 1);
  const pow = 1 - 0.7 * bias;
  for (let i = 0; i <= count; i++) {
    const u = i / count;
    if (bias < 0.02) {
      out.push(u);
      continue;
    }
    if (u <= a) {
      const local = a < 1e-6 ? 0 : u / a;
      out.push(Math.pow(local, pow) * a);
    } else {
      const local = (u - a) / Math.max(1e-6, 1 - a);
      out.push(a + (1 - Math.pow(1 - local, pow)) * (1 - a));
    }
  }
  return out;
}

/**
 * Analytical arc samples from muzzle through the hit point (last sample = cursor).
 * Near: more dots, denser near apex. Far: fewer, evenly spaced along the stretch.
 * @returns {{ x: number, y: number }[]}
 */
export function sampleArcThroughHit(x0, y0, vx, vy, gravity, flightT, opts = {}) {
  const distNorm = clamp(opts.distNorm ?? 0.5, 0, 1);
  const dots = Math.round(
    opts.dots ?? lerp(PLAYER_WEAPON.arcDotsNear, PLAYER_WEAPON.arcDotsFar, distNorm),
  );
  const tHit = Math.max(1e-4, flightT);
  // Apex time (going up first when vy < 0 with Y+ down).
  const tApex = vy < 0 ? clamp(-vy / gravity, 0, tHit) : 0;
  const apexU = tApex / tHit;
  const apexBias = lerp(PLAYER_WEAPON.arcApexBiasNear, PLAYER_WEAPON.arcApexBiasFar, distNorm);
  const fracs = sampleTimeFractions(dots, apexU, apexBias);

  const points = [];
  for (const u of fracs) {
    const p = ballisticAt(x0, y0, vx, vy, gravity, tHit * u);
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
