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
  minLaunchSpeed: 200,
  /** Soft ceiling — rises with distance so far flat shots don't snap into sky lobs. */
  maxLaunchSpeedNear: 560,
  maxLaunchSpeedFar: 980,
  maxLaunchSpeed: 640,
  /** Distance band for near(bell) → far(flat) morph (logical px from muzzle). */
  arcNearDist: 95,
  arcFarDist: 560,
  /** Travel speed used in t ≈ dist/speed — near slower (taller lob), far faster (flatter). */
  arcSpeedNear: 200,
  arcSpeedFar: 720,
  /** Extra flight-time mul — near stacks into a bell, far stays ~1 (shallow). */
  arcLobNear: 1.85,
  arcLobFar: 1.0,
  arcMinFlightT: 0.18,
  arcMaxFlightTNear: 1.2,
  arcMaxFlightTFar: 1.25,
  /** Preview sample count + apex clustering (near denser / apex-weighted). */
  arcDotsNear: 30,
  arcDotsFar: 16,
  arcApexBiasNear: 0.72,
  arcApexBiasFar: 0.08,
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
