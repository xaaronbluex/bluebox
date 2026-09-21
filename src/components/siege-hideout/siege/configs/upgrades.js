/** Between-wave upgrade pool (pick 1 of 3). */

export const UPGRADES = {
  iron_bolts: {
    id: "iron_bolts",
    label: "Iron Bolts",
    description: "+25% ballista damage.",
    apply(mods) {
      mods.playerDamageMul *= 1.25;
    },
  },
  watchtower_orders: {
    id: "watchtower_orders",
    label: "Watchtower Orders",
    description: "Tower fires 25% faster.",
    apply(mods) {
      mods.towerCooldownMul *= 0.75;
    },
  },
  masons_kit: {
    id: "masons_kit",
    label: "Mason's Kit",
    description: "Restore 20 castle HP (cap max).",
    apply(mods, state) {
      state.castleHp = Math.min(state.castleMaxHp, state.castleHp + 20);
    },
  },
  powder_cache: {
    id: "powder_cache",
    label: "Powder Cache",
    description: "+20% projectile speed.",
    apply(mods) {
      mods.projSpeedMul *= 1.2;
    },
  },
  red_ink: {
    id: "red_ink",
    label: "Red Ink Targeting",
    description: "+15% Marks from kills.",
    apply(mods) {
      mods.rewardMul *= 1.15;
    },
  },
  tower_bolts: {
    id: "tower_bolts",
    label: "Tower Bolts",
    description: "+30% tower damage.",
    apply(mods) {
      mods.towerDamageMul *= 1.3;
    },
  },
  spotter_glass: {
    id: "spotter_glass",
    label: "Spotter Glass",
    description: "+40 tower range.",
    apply(mods) {
      mods.towerRangeAdd += 40;
    },
  },
  quick_reload: {
    id: "quick_reload",
    label: "Quick Reload",
    description: "Ballista cooldown −20%.",
    apply(mods) {
      mods.playerCooldownMul *= 0.8;
    },
  },
  field_rations: {
    id: "field_rations",
    label: "Field Rations",
    description: "+10 max castle HP and heal 10.",
    apply(mods, state) {
      state.castleMaxHp += 10;
      state.castleHp = Math.min(state.castleMaxHp, state.castleHp + 10);
    },
  },
};

export const UPGRADE_IDS = Object.keys(UPGRADES);

/**
 * Pick `count` unique upgrades, preferring ones not yet taken this run.
 * @param {string[]} ownedIds
 * @param {number} count
 * @param {() => number} rng 0..1
 */
export function rollUpgradeChoices(ownedIds, count = 3, rng = Math.random) {
  const owned = new Set(ownedIds);
  const fresh = UPGRADE_IDS.filter((id) => !owned.has(id));
  const pool = fresh.length >= count ? fresh : [...UPGRADE_IDS];
  const picks = [];
  const bag = [...pool];
  while (picks.length < count && bag.length) {
    const i = Math.floor(rng() * bag.length);
    picks.push(bag.splice(i, 1)[0]);
  }
  return picks.map((id) => UPGRADES[id]);
}
