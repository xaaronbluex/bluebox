/**
 * Versioned Hideout persistence (floorplan-style localStorage).
 * Key separate from Siege last-run handoff.
 */

import { BUILDINGS, BUILDING_IDS } from "./configs/buildings.js";
import { emptyResources } from "./configs/resources.js";

export const HIDEOUT_STORAGE_KEY = "siege-hideout:hideout-v1";
export const HIDEOUT_STORAGE_VERSION = 1;

/** Last Siege Run summary — written by siegeSim; claimed once by Hideout. */
export const LAST_RUN_KEY = "siege-hideout:last-run";

/**
 * @typedef {object} BuildingSave
 * @property {number} level
 * @property {number} cycleStartedAt  epoch ms
 * @property {number} pending         ready-to-collect amount
 */

/**
 * @typedef {object} HideoutSave
 * @property {number} version
 * @property {{ supplies: number, stone: number, marks: number }} resources
 * @property {Record<string, BuildingSave>} buildings
 * @property {number | null} lastClaimedRunAt  epoch of last-run already applied
 * @property {number} updatedAt
 */

function defaultBuilding(now = Date.now()) {
  return { level: 1, cycleStartedAt: now, pending: 0 };
}

/** Fresh Hideout state (all producers L1, timers just started). */
export function createDefaultHideout(now = Date.now()) {
  /** @type {HideoutSave} */
  const save = {
    version: HIDEOUT_STORAGE_VERSION,
    resources: emptyResources(),
    buildings: {},
    lastClaimedRunAt: null,
    updatedAt: now,
  };
  for (const id of BUILDING_IDS) {
    save.buildings[id] = defaultBuilding(now);
  }
  // Modest starter stash so upgrades are reachable after one Siege.
  save.resources.supplies = 18;
  save.resources.stone = 14;
  save.resources.marks = 6;
  return save;
}

function migrate(raw) {
  if (!raw || typeof raw !== "object") return createDefaultHideout();
  const now = Date.now();
  const base = createDefaultHideout(now);
  const version = Number(raw.version) || 0;
  if (version > HIDEOUT_STORAGE_VERSION) {
    // Future save — keep what we understand.
  }
  const resources = {
    supplies: Math.max(0, Math.floor(Number(raw.resources?.supplies) || 0)),
    stone: Math.max(0, Math.floor(Number(raw.resources?.stone) || 0)),
    marks: Math.max(0, Math.floor(Number(raw.resources?.marks) || 0)),
  };
  const buildings = {};
  for (const id of BUILDING_IDS) {
    const src = raw.buildings?.[id];
    const def = BUILDINGS[id];
    const level = Math.min(
      def.maxLevel,
      Math.max(1, Math.floor(Number(src?.level) || 1)),
    );
    buildings[id] = {
      level,
      cycleStartedAt: Math.max(
        0,
        Math.floor(Number(src?.cycleStartedAt) || now),
      ),
      pending: Math.max(0, Math.floor(Number(src?.pending) || 0)),
    };
  }
  return {
    version: HIDEOUT_STORAGE_VERSION,
    resources,
    buildings,
    lastClaimedRunAt:
      raw.lastClaimedRunAt == null
        ? null
        : Math.floor(Number(raw.lastClaimedRunAt)) || null,
    updatedAt: Math.floor(Number(raw.updatedAt) || now),
  };
}

/** @returns {HideoutSave} */
export function loadHideout() {
  try {
    const raw = localStorage.getItem(HIDEOUT_STORAGE_KEY);
    if (!raw) return createDefaultHideout();
    return migrate(JSON.parse(raw));
  } catch {
    return createDefaultHideout();
  }
}

/** @param {HideoutSave} save */
export function saveHideout(save) {
  const next = {
    ...save,
    version: HIDEOUT_STORAGE_VERSION,
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(HIDEOUT_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}

/** Read last Siege Run handoff without claiming. */
export function readLastRun() {
  try {
    const raw = localStorage.getItem(LAST_RUN_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data;
  } catch {
    return null;
  }
}

/**
 * Apply unclaimed Siege rewards into Hideout once per `at` timestamp.
 * @param {HideoutSave} save
 * @returns {{ save: HideoutSave, claimed: object | null }}
 */
export function claimLastRunIfNeeded(save) {
  const last = readLastRun();
  if (!last || last.at == null) return { save, claimed: null };
  const at = Math.floor(Number(last.at));
  if (!at || save.lastClaimedRunAt === at) return { save, claimed: null };

  const marks = Math.max(0, Math.floor(Number(last.marks) || 0));
  const waves = Math.max(0, Math.floor(Number(last.waves) || 0));
  const kills = Math.max(0, Math.floor(Number(last.kills) || 0));
  const victory = last.outcome === "victory";

  const bonusSupplies = Math.floor(waves * 2 + kills * 0.15) + (victory ? 8 : 2);
  const bonusStone = Math.floor(waves * 1.5 + kills * 0.1) + (victory ? 6 : 1);
  const bonusMarks = Math.floor(marks * 0.35) + (victory ? 5 : 1);

  const next = {
    ...save,
    resources: {
      supplies: save.resources.supplies + bonusSupplies,
      stone: save.resources.stone + bonusStone,
      marks: save.resources.marks + bonusMarks,
    },
    lastClaimedRunAt: at,
  };
  saveHideout(next);
  return {
    save: next,
    claimed: {
      at,
      outcome: last.outcome,
      supplies: bonusSupplies,
      stone: bonusStone,
      marks: bonusMarks,
      runMarks: marks,
      waves,
    },
  };
}
