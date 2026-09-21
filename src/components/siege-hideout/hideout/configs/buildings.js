/**
 * Hideout buildings — AFK producers + modest permanent Siege bonuses.
 * Cycle lengths: 5–10 minutes.
 */

const MIN = 60_000;

/** @typedef {{ supplies?: number, stone?: number, marks?: number }} ResourceBag */

/**
 * @typedef {object} BuildingDef
 * @property {string} id
 * @property {string} label
 * @property {string} role
 * @property {keyof import('./resources.js').RESOURCES} output
 * @property {number} cycleMs
 * @property {(level: number) => number} yieldAt
 * @property {(level: number) => number} storageCap
 * @property {(level: number) => ResourceBag} upgradeCost
 * @property {number} maxLevel
 * @property {(level: number) => Record<string, number>} siegeBonus
 * @property {{ x: number, y: number, w: number, h: number }} layout
 * @property {string} fill
 * @property {string} accent
 */

/** @type {Record<string, BuildingDef>} */
export const BUILDINGS = {
  keep: {
    id: "keep",
    label: "Keep",
    role: "Command",
    output: "marks",
    cycleMs: 8 * MIN,
    yieldAt: (lv) => 2 + lv,
    storageCap: (lv) => 6 + lv * 3,
    upgradeCost: (lv) => ({
      supplies: 12 + lv * 8,
      stone: 10 + lv * 7,
      marks: 4 + lv * 3,
    }),
    maxLevel: 5,
    siegeBonus: (lv) => ({
      castleHpAdd: lv * 8,
      rewardMulAdd: lv * 0.03,
    }),
    layout: { x: 420, y: 168, w: 120, h: 110 },
    fill: "#3D5168",
    accent: "#C69A43",
  },
  depot: {
    id: "depot",
    label: "Supply Depot",
    role: "Stores",
    output: "supplies",
    cycleMs: 5 * MIN,
    yieldAt: (lv) => 4 + lv * 2,
    storageCap: (lv) => 16 + lv * 6,
    upgradeCost: (lv) => ({ supplies: 8 + lv * 5, stone: 4 + lv * 3 }),
    maxLevel: 5,
    siegeBonus: (lv) => ({ rewardMulAdd: lv * 0.02 }),
    layout: { x: 220, y: 250, w: 100, h: 72 },
    fill: "#8B6A45",
    accent: "#A88455",
  },
  quarry: {
    id: "quarry",
    label: "Quarry",
    role: "Stone · Iron",
    output: "stone",
    cycleMs: 6 * MIN,
    yieldAt: (lv) => 3 + lv * 2,
    storageCap: (lv) => 14 + lv * 5,
    upgradeCost: (lv) => ({ supplies: 6 + lv * 4, stone: 8 + lv * 5 }),
    maxLevel: 5,
    siegeBonus: (lv) => ({ castleHpAdd: lv * 4 }),
    layout: { x: 640, y: 270, w: 108, h: 78 },
    fill: "#6A727C",
    accent: "#A8ADB3",
  },
  workshop: {
    id: "workshop",
    label: "Workshop",
    role: "Arms",
    output: "supplies",
    cycleMs: 7 * MIN,
    yieldAt: (lv) => 3 + lv * 2,
    storageCap: (lv) => 12 + lv * 4,
    upgradeCost: (lv) => ({
      supplies: 10 + lv * 6,
      stone: 8 + lv * 5,
      marks: 2 + lv * 2,
    }),
    maxLevel: 5,
    siegeBonus: (lv) => ({
      playerDamageMulAdd: lv * 0.04,
      projSpeedMulAdd: lv * 0.02,
    }),
    layout: { x: 300, y: 340, w: 96, h: 68 },
    fill: "#5C452E",
    accent: "#C69A43",
  },
  garden: {
    id: "garden",
    label: "Garden",
    role: "Rations",
    output: "supplies",
    cycleMs: 5 * MIN,
    yieldAt: (lv) => 3 + lv,
    storageCap: (lv) => 14 + lv * 5,
    upgradeCost: (lv) => ({ supplies: 5 + lv * 3, stone: 3 + lv * 2 }),
    maxLevel: 5,
    siegeBonus: (lv) => ({ castleHpAdd: lv * 2 }),
    layout: { x: 520, y: 330, w: 110, h: 64 },
    fill: "#5A6B4A",
    accent: "#4A5C3E",
  },
  watchtower: {
    id: "watchtower",
    label: "Watchtower",
    role: "Orders",
    output: "marks",
    cycleMs: 9 * MIN,
    yieldAt: (lv) => 1 + lv,
    storageCap: (lv) => 4 + lv * 2,
    upgradeCost: (lv) => ({
      supplies: 8 + lv * 5,
      stone: 12 + lv * 7,
      marks: 3 + lv * 2,
    }),
    maxLevel: 5,
    siegeBonus: (lv) => ({
      towerDamageMulAdd: lv * 0.05,
      towerRangeAdd: lv * 8,
      towerCooldownMulAdd: -lv * 0.03,
    }),
    layout: { x: 760, y: 180, w: 56, h: 120 },
    fill: "#2A3A52",
    accent: "#4A6A9A",
  },
  repair: {
    id: "repair",
    label: "Repair Yard",
    role: "Masonry",
    output: "stone",
    cycleMs: 8 * MIN,
    yieldAt: (lv) => 2 + lv * 2,
    storageCap: (lv) => 12 + lv * 4,
    upgradeCost: (lv) => ({ supplies: 7 + lv * 4, stone: 9 + lv * 6 }),
    maxLevel: 5,
    siegeBonus: (lv) => ({
      castleHpAdd: lv * 10,
      playerCooldownMulAdd: -lv * 0.02,
    }),
    layout: { x: 140, y: 200, w: 90, h: 80 },
    fill: "#4E565E",
    accent: "#8A8680",
  },
};

export const BUILDING_IDS = Object.keys(BUILDINGS);

export function getBuildingDef(id) {
  return BUILDINGS[id] || null;
}
