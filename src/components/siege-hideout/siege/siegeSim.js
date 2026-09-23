/**
 * Pure-ish Siege Run simulation. Presentation reads snapshots only.
 */

import { getEnemyDef } from "./configs/enemies.js";
import { CASTLE, PLAYER_WEAPON, AUTO_TOWER } from "./configs/weapons.js";
import { WAVE_COUNT, getWave } from "./configs/waves.js";
import { UPGRADES, rollUpgradeChoices } from "./configs/upgrades.js";
import { getSiegeBonusesFromHideout } from "../hideout/hideoutSim.js";
import { LAST_RUN_KEY } from "../hideout/hideoutStorage.js";
import {
  ballisticAt,
  getPlayerMuzzle,
  launchFromPointer,
} from "./ballistic.js";

/** Combat lane Y band (matches style-test MAP_Y combat region). */
export const LANE = {
  minY: 220,
  maxY: 310,
  spawnX: 920,
  /** Soft left kill / contact line near castle. */
  leftBound: CASTLE.contactX,
};

const PHASE = {
  combat: "combat",
  betweenWaves: "betweenWaves",
  paused: "paused",
  victory: "victory",
  defeat: "defeat",
};

function defaultMods() {
  return {
    playerDamageMul: 1,
    playerCooldownMul: 1,
    towerDamageMul: 1,
    towerCooldownMul: 1,
    towerRangeAdd: 0,
    projSpeedMul: 1,
    rewardMul: 1,
  };
}

/** Fold Hideout permanent bonuses into a fresh mods + castle HP package. */
function applyHideoutBonuses(state) {
  let bonus;
  try {
    bonus = getSiegeBonusesFromHideout();
  } catch {
    bonus = null;
  }
  if (!bonus) return;
  state.mods.playerDamageMul += bonus.playerDamageMulAdd || 0;
  state.mods.playerCooldownMul = Math.max(
    0.55,
    state.mods.playerCooldownMul + (bonus.playerCooldownMulAdd || 0),
  );
  state.mods.towerDamageMul += bonus.towerDamageMulAdd || 0;
  state.mods.towerCooldownMul = Math.max(
    0.55,
    state.mods.towerCooldownMul + (bonus.towerCooldownMulAdd || 0),
  );
  state.mods.towerRangeAdd += bonus.towerRangeAdd || 0;
  state.mods.projSpeedMul += bonus.projSpeedMulAdd || 0;
  state.mods.rewardMul += bonus.rewardMulAdd || 0;
  const hpAdd = Math.max(0, Math.floor(bonus.castleHpAdd || 0));
  state.castleMaxHp = CASTLE.maxHp + hpAdd;
  state.castleHp = state.castleMaxHp;
  state.hideoutBonus = bonus;
}

function writeLastRun(summary) {
  try {
    localStorage.setItem(
      LAST_RUN_KEY,
      JSON.stringify({ ...summary, at: Date.now() }),
    );
  } catch {
    /* ignore */
  }
}

function laneY(seed) {
  const t = ((seed * 9301 + 49297) % 233280) / 233280;
  return LANE.minY + t * (LANE.maxY - LANE.minY);
}

function createEnemy(typeId, id, seed) {
  const def = getEnemyDef(typeId);
  return {
    id,
    type: typeId,
    x: LANE.spawnX + (seed % 40),
    y: laneY(seed),
    hp: def.hp,
    maxHp: def.hp,
    radius: def.radius,
    speed: def.speed,
    damage: def.damage,
    reward: def.reward,
    fireCd: def.fireInterval ? def.fireInterval * 0.5 : 0,
    alive: true,
  };
}

/**
 * Flatten wave spawn schedule into timed queue entries.
 * @returns {{ t: number, type: string }[]}
 */
function buildSpawnQueue(wave) {
  const queue = [];
  let cursor = 0.4;
  for (const group of wave.spawns) {
    for (let i = 0; i < group.count; i++) {
      queue.push({ t: cursor, type: group.type });
      cursor += group.interval || 0.8;
    }
    cursor += 0.35;
  }
  queue.sort((a, b) => a.t - b.t);
  return queue;
}

export function createSiegeState() {
  const muzzle = getPlayerMuzzle();
  const initial = launchFromPointer(muzzle.x, muzzle.y, 520, 200, { projSpeedMul: 1 });
  const state = {
    phase: PHASE.combat,
    pauseResumePhase: PHASE.combat,
    waveIndex: 1,
    waveTime: 0,
    spawnQueue: buildSpawnQueue(getWave(1)),
    spawnCursor: 0,
    nextEntityId: 1,
    enemies: [],
    projectiles: [],
    fx: [],
    castleHp: CASTLE.maxHp,
    castleMaxHp: CASTLE.maxHp,
    marks: 0,
    ownedUpgrades: [],
    upgradeChoices: [],
    mods: defaultMods(),
    playerCd: 0,
    towerCd: 0,
    /** Raw pointer in logical space — arc is solved to pass through this. */
    pointerX: 520,
    pointerY: 200,
    aimX: 520,
    aimY: 200,
    /** Launch solved so parabola hits pointer (vx/vy/flightT drive preview + fire). */
    aimAngle: initial.angle,
    aimSpeed: initial.speed,
    aimVx: initial.vx,
    aimVy: initial.vy,
    aimFlightT: initial.flightT,
    aimPowerT: initial.powerT,
    aimDistNorm: initial.distNorm,
    kills: 0,
    elapsed: 0,
    summary: null,
    hideoutBonus: null,
  };
  applyHideoutBonuses(state);
  // Recompute speed after hideout projSpeedMul
  snapAimFromPointer(state);
  return state;
}

export function getSiegeConstants() {
  return { CASTLE, PLAYER_WEAPON, AUTO_TOWER, WAVE_COUNT, LANE, PHASE };
}

function pushFx(state, kind, x, y, life = 0.35) {
  state.fx.push({ id: state.nextEntityId++, kind, x, y, life, maxLife: life });
}

function spawnDue(state) {
  while (
    state.spawnCursor < state.spawnQueue.length &&
    state.spawnQueue[state.spawnCursor].t <= state.waveTime
  ) {
    const entry = state.spawnQueue[state.spawnCursor++];
    const id = state.nextEntityId++;
    state.enemies.push(createEnemy(entry.type, id, id * 17 + state.waveIndex * 31));
  }
}

function enemyReachedCastle(enemy) {
  return enemy.x - enemy.radius <= LANE.leftBound;
}

function updateEnemies(state, dt) {
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const def = getEnemyDef(e.type);

    if (def.standOff != null) {
      const targetX = LANE.leftBound + def.standOff;
      if (e.x > targetX) {
        e.x -= e.speed * dt;
      } else {
        e.fireCd -= dt;
        if (e.fireCd <= 0) {
          e.fireCd = def.fireInterval;
          state.projectiles.push({
            id: state.nextEntityId++,
            team: "enemy",
            x: e.x,
            y: e.y,
            vx: -def.projectileSpeed,
            vy: 0,
            damage: def.projectileDamage,
            radius: 2.5,
            life: 3,
          });
        }
      }
    } else {
      e.x -= e.speed * dt;
    }

    if (enemyReachedCastle(e)) {
      e.alive = false;
      state.castleHp -= e.damage;
      pushFx(state, "hitCastle", LANE.leftBound + 8, e.y, 0.4);
    }
  }
  state.enemies = state.enemies.filter((e) => e.alive && e.hp > 0);
}

function damageEnemy(state, enemy, amount, fromRight = true) {
  const def = getEnemyDef(enemy.type);
  let dmg = amount;
  if (def.frontMitigation != null && fromRight) {
    dmg *= def.frontMitigation;
  }
  enemy.hp -= dmg;
  pushFx(state, "spark", enemy.x, enemy.y, 0.2);
  if (enemy.hp <= 0) {
    enemy.alive = false;
    const reward = Math.round(enemy.reward * state.mods.rewardMul);
    state.marks += reward;
    state.kills += 1;
    pushFx(state, "kill", enemy.x, enemy.y, 0.35);
  }
}

function snapAimFromPointer(state) {
  const { x: mx, y: my } = getPlayerMuzzle();
  const launch = launchFromPointer(mx, my, state.pointerX, state.pointerY, state.mods);
  state.aimAngle = launch.angle;
  state.aimSpeed = launch.speed;
  state.aimVx = launch.vx;
  state.aimVy = launch.vy;
  state.aimFlightT = launch.flightT;
  state.aimPowerT = launch.powerT;
  state.aimDistNorm = launch.distNorm;
  // Keep aim point = real mouse (arc endpoint); no canvas reticule.
  state.aimX = state.pointerX;
  state.aimY = state.pointerY;
}

function updateProjectiles(state, dt) {
  const g = PLAYER_WEAPON.gravity;
  for (const p of state.projectiles) {
    if (p.ballistic) {
      // Closed-form so flight matches the cursor-hit preview exactly.
      p.age = (p.age || 0) + dt;
      const pose = ballisticAt(p.x0, p.y0, p.vx0, p.vy0, g, p.age);
      p.x = pose.x;
      p.y = pose.y;
      p.vx = pose.vx;
      p.vy = pose.vy;
    } else {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    p.life -= dt;

    if (p.team === "player") {
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const dx = e.x - p.x;
        const dy = e.y - p.y;
        if (dx * dx + dy * dy <= (e.radius + p.radius) ** 2) {
          damageEnemy(state, e, p.damage, p.vx > 0);
          p.life = 0;
          break;
        }
      }
    } else if (p.team === "enemy") {
      if (p.x <= LANE.leftBound + 10) {
        state.castleHp -= p.damage;
        pushFx(state, "hitCastle", LANE.leftBound + 8, p.y, 0.3);
        p.life = 0;
      }
    }
  }
  state.projectiles = state.projectiles.filter(
    (p) => p.life > 0 && p.x > -20 && p.x < 980 && p.y > -40 && p.y < 420,
  );
}

function updateTower(state, dt) {
  state.towerCd = Math.max(0, state.towerCd - dt);
  if (state.towerCd > 0) return;

  const range = AUTO_TOWER.range + state.mods.towerRangeAdd;
  const range2 = range * range;
  const tx = AUTO_TOWER.position.x;
  const ty = AUTO_TOWER.position.y;
  let best = null;
  let bestD2 = Infinity;
  for (const e of state.enemies) {
    if (!e.alive) continue;
    const dx = e.x - tx;
    const dy = e.y - ty;
    const d2 = dx * dx + dy * dy;
    if (d2 <= range2 && d2 < bestD2) {
      best = e;
      bestD2 = d2;
    }
  }
  if (!best) return;

  const speed = AUTO_TOWER.projectileSpeed * state.mods.projSpeedMul;
  const dx = best.x - tx;
  const dy = best.y - ty;
  const len = Math.hypot(dx, dy) || 1;
  state.projectiles.push({
    id: state.nextEntityId++,
    team: "player",
    x: tx,
    y: ty,
    vx: (dx / len) * speed,
    vy: (dy / len) * speed,
    damage: AUTO_TOWER.damage * state.mods.towerDamageMul,
    radius: AUTO_TOWER.projectileRadius,
    life: 2.5,
  });
  state.towerCd = AUTO_TOWER.cooldown * state.mods.towerCooldownMul;
}

function waveCleared(state) {
  return (
    state.spawnCursor >= state.spawnQueue.length &&
    state.enemies.length === 0 &&
    !state.projectiles.some((p) => p.team === "enemy")
  );
}

function enterBetweenWaves(state) {
  if (state.waveIndex >= WAVE_COUNT) {
    state.phase = PHASE.victory;
    state.summary = {
      outcome: "victory",
      waves: state.waveIndex,
      marks: state.marks,
      kills: state.kills,
      upgrades: [...state.ownedUpgrades],
    };
    writeLastRun(state.summary);
    return;
  }
  state.phase = PHASE.betweenWaves;
  state.upgradeChoices = rollUpgradeChoices(state.ownedUpgrades, 3);
  state.projectiles = [];
  state.fx = [];
}

function startNextWave(state) {
  state.waveIndex += 1;
  state.waveTime = 0;
  state.spawnQueue = buildSpawnQueue(getWave(state.waveIndex));
  state.spawnCursor = 0;
  state.enemies = [];
  state.projectiles = [];
  state.phase = PHASE.combat;
  state.upgradeChoices = [];
}

/**
 * Advance simulation by dt seconds.
 * @param {ReturnType<typeof createSiegeState>} state
 * @param {number} dt
 */
export function tickSiege(state, dt) {
  const step = Math.min(dt, 0.05);

  // Aim tracks the pointer 1:1 (no laggy exponential smooth on the reticule).
  if (
    state.phase === PHASE.combat ||
    state.phase === PHASE.paused
  ) {
    snapAimFromPointer(state);
  }

  if (state.phase === PHASE.paused) return;
  if (state.phase === PHASE.victory || state.phase === PHASE.defeat) return;
  if (state.phase === PHASE.betweenWaves) {
    for (const f of state.fx) f.life -= dt;
    state.fx = state.fx.filter((f) => f.life > 0);
    return;
  }

  state.elapsed += step;
  state.waveTime += step;
  state.playerCd = Math.max(0, state.playerCd - step);

  spawnDue(state);
  updateEnemies(state, step);
  updateProjectiles(state, step);
  updateTower(state, step);

  for (const f of state.fx) f.life -= step;
  state.fx = state.fx.filter((f) => f.life > 0);

  if (state.castleHp <= 0) {
    state.castleHp = 0;
    state.phase = PHASE.defeat;
    state.summary = {
      outcome: "defeat",
      waves: state.waveIndex,
      marks: state.marks,
      kills: state.kills,
      upgrades: [...state.ownedUpgrades],
    };
    writeLastRun(state.summary);
    return;
  }

  if (waveCleared(state)) {
    enterBetweenWaves(state);
  }
}

export function setAim(state, x, y) {
  state.pointerX = x;
  state.pointerY = y;
  // Snap immediately on input so the reticule does not wait for the next tick.
  if (state.phase === PHASE.combat || state.phase === PHASE.paused) {
    snapAimFromPointer(state);
  }
}

/** Current launch velocity matching the live cursor-hit arc. */
export function getPlayerLaunch(state) {
  return { vx: state.aimVx, vy: state.aimVy };
}

/** Fire player ballista along the cursor-constrained ballistic lob. */
export function tryPlayerFire(state) {
  if (state.phase !== PHASE.combat) return false;
  if (state.playerCd > 0) return false;

  snapAimFromPointer(state);
  const { x: muzzleX, y: muzzleY } = getPlayerMuzzle();

  state.projectiles.push({
    id: state.nextEntityId++,
    team: "player",
    ballistic: true,
    x0: muzzleX,
    y0: muzzleY,
    vx0: state.aimVx,
    vy0: state.aimVy,
    age: 0,
    x: muzzleX,
    y: muzzleY,
    vx: state.aimVx,
    vy: state.aimVy,
    damage: PLAYER_WEAPON.damage * state.mods.playerDamageMul,
    radius: PLAYER_WEAPON.projectileRadius,
    life: PLAYER_WEAPON.boltLife,
  });
  state.playerCd = PLAYER_WEAPON.cooldown * state.mods.playerCooldownMul;
  return true;
}

export function togglePause(state) {
  if (state.phase === PHASE.combat) {
    state.pauseResumePhase = PHASE.combat;
    state.phase = PHASE.paused;
    return;
  }
  if (state.phase === PHASE.paused) {
    state.phase = state.pauseResumePhase || PHASE.combat;
  }
}

export function chooseUpgrade(state, upgradeId) {
  if (state.phase !== PHASE.betweenWaves) return false;
  const def = UPGRADES[upgradeId];
  if (!def) return false;
  def.apply(state.mods, state);
  state.ownedUpgrades.push(upgradeId);
  startNextWave(state);
  return true;
}

export function restartSiege(state) {
  const next = createSiegeState();
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, next);
}

/**
 * Capture / debug helpers (URL ?siegeCapture=wave|upgrade|victory).
 * Mutates live state in place.
 */
export function applyCapturePreset(state, preset) {
  restartSiege(state);
  if (preset === "wave") {
    state.waveIndex = 2;
    state.marks = 18;
    state.spawnQueue = [];
    state.spawnCursor = 0;
    state.enemies = [
      createEnemy("infantry", state.nextEntityId++, 11),
      createEnemy("scout", state.nextEntityId++, 22),
      createEnemy("shield", state.nextEntityId++, 33),
      createEnemy("brute", state.nextEntityId++, 44),
    ];
    state.enemies[0].x = 520;
    state.enemies[1].x = 610;
    state.enemies[2].x = 700;
    state.enemies[3].x = 800;
    state.phase = PHASE.combat;
    setAim(state, 640, 140);
    return;
  }
  if (preset === "arcAim") {
    applyCapturePreset(state, "wave");
    setAim(state, 700, 90);
    state.playerCd = 0;
    return;
  }
  if (preset === "arcShot") {
    applyCapturePreset(state, "arcAim");
    tryPlayerFire(state);
    // Advance bolt along the arc for a mid-flight frame
    for (let i = 0; i < 28; i++) {
      updateProjectiles(state, 1 / 60);
    }
    return;
  }
  if (preset === "aimStick") {
    applyCapturePreset(state, "wave");
    setAim(state, 580, 160);
    state.playerCd = 0;
    return;
  }
  if (preset === "arcNear") {
    applyCapturePreset(state, "wave");
    // Close to muzzle → dense bell lob
    setAim(state, 250, 200);
    state.playerCd = 0;
    return;
  }
  if (preset === "arcFar") {
    applyCapturePreset(state, "wave");
    // Far field → shallow stretched arc
    setAim(state, 820, 240);
    state.playerCd = 0;
    return;
  }
  if (preset === "upgrade") {
    state.waveIndex = 2;
    state.marks = 42;
    state.enemies = [];
    state.spawnQueue = [];
    state.spawnCursor = 0;
    state.phase = PHASE.betweenWaves;
    const prefer = ["tower_bolts", "powder_cache", "spotter_glass"];
    state.upgradeChoices = prefer.map((id) => UPGRADES[id]).filter(Boolean);
    if (state.upgradeChoices.length < 3) {
      state.upgradeChoices = rollUpgradeChoices([], 3);
    }
    return;
  }
  if (preset === "victory") {
    state.waveIndex = WAVE_COUNT;
    state.marks = 120;
    state.kills = 64;
    state.phase = PHASE.victory;
    state.summary = {
      outcome: "victory",
      waves: WAVE_COUNT,
      marks: state.marks,
      kills: state.kills,
      upgrades: [],
    };
  }
}

/** Lightweight render snapshot (arrays are live refs — render must not mutate). */
export function snapshotSiege(state) {
  return state;
}

export { PHASE };
