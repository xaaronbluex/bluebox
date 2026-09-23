/**
 * Hideout production sim — AFK cycles from timestamps, collect, upgrade.
 * Persistence via hideoutStorage; presentation reads snapshots only.
 */

import { BUILDINGS, BUILDING_IDS, getBuildingDef } from "./configs/buildings.js";
import {
  loadHideout,
  saveHideout,
  claimLastRunIfNeeded,
  createDefaultHideout,
} from "./hideoutStorage.js";

/**
 * Advance pending production from wall-clock timestamps (refresh-safe).
 * Completes as many full cycles as fit until storageCap; does not auto-claim.
 * @param {import('./hideoutStorage.js').HideoutSave} save
 * @param {number} [now]
 */
export function syncProduction(save, now = Date.now()) {
  for (const id of BUILDING_IDS) {
    const def = BUILDINGS[id];
    const b = save.buildings[id];
    if (!b || !def) continue;
    const yieldAmt = def.yieldAt(b.level);
    const cap = def.storageCap(b.level);
    if (b.pending >= cap) {
      // Full — freeze timer at "just completed" so we don't lose progress quirks.
      b.cycleStartedAt = now - def.cycleMs;
      continue;
    }
    const elapsed = Math.max(0, now - b.cycleStartedAt);
    const cycles = Math.floor(elapsed / def.cycleMs);
    if (cycles <= 0) continue;
    const add = Math.min(cap - b.pending, cycles * yieldAmt);
    b.pending += add;
    // Keep remainder time so partial progress survives refresh.
    const remainder = elapsed % def.cycleMs;
    if (b.pending >= cap) {
      b.cycleStartedAt = now - def.cycleMs;
    } else {
      b.cycleStartedAt = now - remainder;
    }
  }
  return save;
}

/**
 * Load + sync + claim Siege rewards once.
 * @returns {{ save: import('./hideoutStorage.js').HideoutSave, claimed: object | null }}
 */
export function bootHideout(now = Date.now()) {
  let save = loadHideout();
  syncProduction(save, now);
  const claim = claimLastRunIfNeeded(save);
  save = claim.save;
  syncProduction(save, now);
  saveHideout(save);
  return { save, claimed: claim.claimed };
}

/**
 * Progress 0..1 toward next ready (ignores already-pending stock).
 * @param {import('./hideoutStorage.js').BuildingSave} b
 * @param {import('./configs/buildings.js').BuildingDef} def
 * @param {number} now
 */
export function cycleProgress(b, def, now = Date.now()) {
  const cap = def.storageCap(b.level);
  if (b.pending >= cap) return 1;
  const elapsed = Math.max(0, now - b.cycleStartedAt);
  return Math.min(1, elapsed / def.cycleMs);
}

export function isReady(b, def) {
  return b.pending > 0;
}

/**
 * Collect pending from one building. Restarts timer from now.
 * @returns {{ ok: boolean, amount: number, resource: string | null, save: import('./hideoutStorage.js').HideoutSave }}
 */
export function collectBuilding(save, buildingId, now = Date.now()) {
  syncProduction(save, now);
  const def = getBuildingDef(buildingId);
  const b = save.buildings[buildingId];
  if (!def || !b || b.pending <= 0) {
    return { ok: false, amount: 0, resource: null, save };
  }
  const amount = b.pending;
  save.resources[def.output] = (save.resources[def.output] || 0) + amount;
  b.pending = 0;
  b.cycleStartedAt = now;
  saveHideout(save);
  return { ok: true, amount, resource: def.output, save };
}

/** Collect every ready building. */
export function collectAll(save, now = Date.now()) {
  syncProduction(save, now);
  let total = 0;
  for (const id of BUILDING_IDS) {
    const r = collectBuilding(save, id, now);
    if (r.ok) total += r.amount;
  }
  return { save, total };
}

/**
 * @returns {{ ok: boolean, reason?: string, save: import('./hideoutStorage.js').HideoutSave }}
 */
export function upgradeBuilding(save, buildingId, now = Date.now()) {
  syncProduction(save, now);
  const def = getBuildingDef(buildingId);
  const b = save.buildings[buildingId];
  if (!def || !b) return { ok: false, reason: "unknown", save };
  if (b.level >= def.maxLevel) return { ok: false, reason: "max", save };
  const cost = def.upgradeCost(b.level);
  for (const [k, v] of Object.entries(cost)) {
    if ((save.resources[k] || 0) < v) {
      return { ok: false, reason: "cost", save };
    }
  }
  for (const [k, v] of Object.entries(cost)) {
    save.resources[k] -= v;
  }
  b.level += 1;
  // Keep pending; new yield applies to future cycles only.
  saveHideout(save);
  return { ok: true, save };
}

/**
 * Aggregate permanent Siege Run modifiers from Hideout building levels.
 * Applied once at run start (createSiegeState / restartSiege).
 */
export function getSiegeBonusesFromHideout(save) {
  const bonus = {
    castleHpAdd: 0,
    playerDamageMulAdd: 0,
    playerCooldownMulAdd: 0,
    towerDamageMulAdd: 0,
    towerCooldownMulAdd: 0,
    towerRangeAdd: 0,
    projSpeedMulAdd: 0,
    rewardMulAdd: 0,
  };
  const src = save || loadHideout();
  for (const id of BUILDING_IDS) {
    const def = BUILDINGS[id];
    const b = src.buildings?.[id];
    if (!def || !b) continue;
    const part = def.siegeBonus(b.level) || {};
    for (const [k, v] of Object.entries(part)) {
      bonus[k] = (bonus[k] || 0) + v;
    }
  }
  return bonus;
}

/** Live snapshot for HUD / render. */
export function snapshotHideout(save, now = Date.now()) {
  syncProduction(save, now);
  const buildings = BUILDING_IDS.map((id) => {
    const def = BUILDINGS[id];
    const b = save.buildings[id];
    return {
      id,
      label: def.label,
      role: def.role,
      output: def.output,
      level: b.level,
      maxLevel: def.maxLevel,
      pending: b.pending,
      cap: def.storageCap(b.level),
      yieldPerCycle: def.yieldAt(b.level),
      cycleMs: def.cycleMs,
      progress: cycleProgress(b, def, now),
      ready: isReady(b, def),
      upgradeCost: b.level < def.maxLevel ? def.upgradeCost(b.level) : null,
      layout: def.layout,
      fill: def.fill,
      accent: def.accent,
    };
  });
  return {
    resources: { ...save.resources },
    buildings,
    lastClaimedRunAt: save.lastClaimedRunAt,
    siegeBonuses: getSiegeBonusesFromHideout(save),
    now,
  };
}

export function resetHideout(now = Date.now()) {
  const save = createDefaultHideout(now);
  saveHideout(save);
  return save;
}

/**
 * Capture / demo presets — mutate save in place then persist.
 * idle: mid-cycle timers; ready: all buildings harvestable.
 */
export function applyHideoutCapturePreset(save, preset, now = Date.now()) {
  if (preset === "ready") {
    for (const id of BUILDING_IDS) {
      const def = BUILDINGS[id];
      const b = save.buildings[id];
      b.level = Math.max(b.level, 2);
      b.pending = def.storageCap(b.level);
      b.cycleStartedAt = now - def.cycleMs;
    }
    save.resources.supplies = Math.max(save.resources.supplies, 40);
    save.resources.stone = Math.max(save.resources.stone, 30);
    save.resources.marks = Math.max(save.resources.marks, 20);
    saveHideout(save);
    return;
  }
  if (preset === "idle") {
    for (const id of BUILDING_IDS) {
      const def = BUILDINGS[id];
      const b = save.buildings[id];
      b.pending = 0;
      b.cycleStartedAt = now - Math.floor(def.cycleMs * 0.45);
    }
    saveHideout(save);
  }
}
