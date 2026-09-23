/** Aimed player weapon + auto tower baseline stats. */

export const PLAYER_WEAPON = {
  id: "ballista",
  label: "Keep Ballista",
  damage: 12,
  cooldown: 0.32,
  /** Legacy linear speed — ballistic shots use min/max launch instead. */
  projectileSpeed: 420,
  projectileRadius: 3.5,
  /** Spawn offset from castle anchor (logical px). */
  muzzleOffset: { x: 36, y: -18 },
  /** Downward accel for player bolts (canvas Y+). Shared with arc preview. */
  gravity: 780,
  minLaunchSpeed: 220,
  maxLaunchSpeed: 560,
  /** Pointer distance from muzzle that reaches maxLaunchSpeed. */
  aimDistanceRef: 300,
  /** Ballistic bolt lifetime before despawn. */
  boltLife: 3.2,
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
