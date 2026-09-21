/**
 * First-slice wave table (~10 waves).
 * Each entry: { delay, spawns: [{ type, count, interval }] }
 */

export const WAVE_COUNT = 10;

export const WAVES = [
  {
    id: 1,
    label: "Probe",
    spawns: [{ type: "infantry", count: 4, interval: 0.9 }],
  },
  {
    id: 2,
    label: "Scouts",
    spawns: [
      { type: "scout", count: 5, interval: 0.7 },
      { type: "infantry", count: 2, interval: 1.1 },
    ],
  },
  {
    id: 3,
    label: "Mixed Line",
    spawns: [
      { type: "infantry", count: 5, interval: 0.75 },
      { type: "ranged", count: 2, interval: 1.4 },
    ],
  },
  {
    id: 4,
    label: "Shield Wall",
    spawns: [
      { type: "shield", count: 3, interval: 1.2 },
      { type: "infantry", count: 4, interval: 0.8 },
    ],
  },
  {
    id: 5,
    label: "Raid",
    spawns: [
      { type: "scout", count: 6, interval: 0.55 },
      { type: "ranged", count: 3, interval: 1.1 },
      { type: "infantry", count: 3, interval: 0.9 },
    ],
  },
  {
    id: 6,
    label: "Heavy Step",
    spawns: [
      { type: "brute", count: 1, interval: 0 },
      { type: "shield", count: 2, interval: 1.3 },
      { type: "infantry", count: 5, interval: 0.7 },
    ],
  },
  {
    id: 7,
    label: "Barrage",
    spawns: [
      { type: "ranged", count: 5, interval: 0.9 },
      { type: "scout", count: 4, interval: 0.6 },
      { type: "infantry", count: 4, interval: 0.85 },
    ],
  },
  {
    id: 8,
    label: "Iron Tide",
    spawns: [
      { type: "shield", count: 4, interval: 1.0 },
      { type: "infantry", count: 6, interval: 0.65 },
      { type: "ranged", count: 3, interval: 1.2 },
    ],
  },
  {
    id: 9,
    label: "Brute Pair",
    spawns: [
      { type: "brute", count: 2, interval: 2.5 },
      { type: "scout", count: 5, interval: 0.5 },
      { type: "shield", count: 2, interval: 1.4 },
    ],
  },
  {
    id: 10,
    label: "Final Push",
    spawns: [
      { type: "brute", count: 2, interval: 2.0 },
      { type: "shield", count: 3, interval: 1.1 },
      { type: "ranged", count: 4, interval: 0.95 },
      { type: "infantry", count: 8, interval: 0.55 },
      { type: "scout", count: 6, interval: 0.45 },
    ],
  },
];

export function getWave(index1Based) {
  return WAVES[index1Based - 1] || null;
}
