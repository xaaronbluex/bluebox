/** Data-driven enemy archetypes for Siege Run. */

export const ENEMY_TYPES = {
  infantry: {
    id: "infantry",
    label: "Infantry",
    hp: 28,
    speed: 38,
    radius: 8,
    damage: 8,
    reward: 4,
    color: "#9C2A2A",
    accent: "#B7332E",
  },
  scout: {
    id: "scout",
    label: "Scout",
    hp: 14,
    speed: 72,
    radius: 6,
    damage: 5,
    reward: 5,
    color: "#C45A3A",
    accent: "#E09A3A",
  },
  ranged: {
    id: "ranged",
    label: "Ranged Raider",
    hp: 20,
    speed: 32,
    radius: 7,
    damage: 4,
    reward: 6,
    color: "#8A3030",
    accent: "#C69A43",
    /** Stop this far from castle and fire. */
    standOff: 210,
    fireInterval: 1.35,
    projectileSpeed: 160,
    projectileDamage: 3,
  },
  shield: {
    id: "shield",
    label: "Shield Bearer",
    hp: 55,
    speed: 26,
    radius: 10,
    damage: 10,
    reward: 8,
    color: "#6F2525",
    accent: "#8D8D87",
    /** Front-facing damage multiplier (aimed shots from the right). */
    frontMitigation: 0.45,
  },
  brute: {
    id: "brute",
    label: "Siege Brute",
    hp: 140,
    speed: 18,
    radius: 16,
    damage: 22,
    reward: 18,
    color: "#5A1E1E",
    accent: "#B7332E",
  },
};

export function getEnemyDef(typeId) {
  return ENEMY_TYPES[typeId] || ENEMY_TYPES.infantry;
}
