/** Aimed player weapon + auto tower baseline stats. */

export const PLAYER_WEAPON = {
  id: "ballista",
  label: "Keep Ballista",
  damage: 12,
  cooldown: 0.28,
  projectileSpeed: 420,
  projectileRadius: 3,
  /** Spawn offset from castle anchor (logical px). */
  muzzleOffset: { x: 36, y: -18 },
};

export const AUTO_TOWER = {
  id: "watchtower",
  label: "Watchtower",
  damage: 7,
  cooldown: 0.85,
  range: 280,
  projectileSpeed: 360,
  projectileRadius: 2.5,
  /** World position relative to battlefield (logical). */
  position: { x: 168, y: 248 },
};

export const CASTLE = {
  maxHp: 100,
  /** Hitbox / contact x for melee enemies. */
  contactX: 118,
  /** Visual anchor for muzzle + HP chrome. */
  anchor: { x: 96, y: 268 },
};
