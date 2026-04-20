const planetRows = [
  {
    name: "Mercury",
    radiusKm: 2439.7,
    mass: "3.3011e23 kg",
    gravity: "3.7 m/s²",
    tempMinC: -180,
    tempMaxC: 430,
    ageBillionYears: 4.503,
    orbitalPeriodDays: 87.969,
    meanLongitudeDegJ2000: 252.25084,
    color: "#c8c4bf",
    rarity: "R",
  },
  {
    name: "Venus",
    radiusKm: 6051.8,
    mass: "4.8675e24 kg",
    gravity: "8.87 m/s²",
    tempMinC: 462,
    tempMaxC: 462,
    ageBillionYears: 4.503,
    orbitalPeriodDays: 224.701,
    meanLongitudeDegJ2000: 181.97973,
    color: "#f0c48b",
    rarity: "R",
  },
  {
    name: "Earth",
    radiusKm: 6371,
    mass: "5.97237e24 kg",
    gravity: "9.81 m/s²",
    tempMinC: -89,
    tempMaxC: 58,
    ageBillionYears: 4.543,
    orbitalPeriodDays: 365.256,
    meanLongitudeDegJ2000: 100.46435,
    color: "#4e8dff",
    rarity: "EXR",
  },
  {
    name: "Mars",
    radiusKm: 3389.5,
    mass: "6.4171e23 kg",
    gravity: "3.71 m/s²",
    tempMinC: -125,
    tempMaxC: 20,
    ageBillionYears: 4.603,
    orbitalPeriodDays: 686.98,
    meanLongitudeDegJ2000: 355.45332,
    color: "#d86b47",
    rarity: "R",
  },
  {
    name: "Jupiter",
    radiusKm: 69911,
    mass: "1.8982e27 kg",
    gravity: "24.79 m/s²",
    tempMinC: -145,
    tempMaxC: -108,
    ageBillionYears: 4.503,
    orbitalPeriodDays: 4332.59,
    meanLongitudeDegJ2000: 34.40438,
    color: "#d5b58c",
    rarity: "SR",
  },
  {
    name: "Saturn",
    radiusKm: 58232,
    mass: "5.6834e26 kg",
    gravity: "10.44 m/s²",
    tempMinC: -178,
    tempMaxC: -139,
    ageBillionYears: 4.503,
    orbitalPeriodDays: 10759.22,
    meanLongitudeDegJ2000: 49.94432,
    color: "#efd7a4",
    rarity: "SR",
  },
  {
    name: "Uranus",
    radiusKm: 25362,
    mass: "8.6810e25 kg",
    gravity: "8.69 m/s²",
    tempMinC: -224,
    tempMaxC: -197,
    ageBillionYears: 4.503,
    orbitalPeriodDays: 30688.5,
    meanLongitudeDegJ2000: 313.23218,
    color: "#96eced",
    rarity: "UR",
  },
  {
    name: "Neptune",
    radiusKm: 24622,
    mass: "1.02413e26 kg",
    gravity: "11.15 m/s²",
    tempMinC: -218,
    tempMaxC: -201,
    ageBillionYears: 4.503,
    orbitalPeriodDays: 60182,
    meanLongitudeDegJ2000: 304.88003,
    color: "#4f74ff",
    rarity: "UR",
  },
  {
    name: "Pluto",
    radiusKm: 1188.3,
    mass: "1.303e22 kg",
    gravity: "0.62 m/s²",
    tempMinC: -240,
    tempMaxC: -218,
    ageBillionYears: 4.46,
    orbitalPeriodDays: 90560,
    meanLongitudeDegJ2000: 238.92881,
    color: "#cfb7a1",
    rarity: "EXR",
  },
];

const j2000EpochUtcMs = Date.UTC(2000, 0, 1, 12, 0, 0);

export function daysSinceJ2000(now = new Date()) {
  return (now.getTime() - j2000EpochUtcMs) / 86400000;
}

export function getPlanetLongitudeDegrees(planet, now = new Date()) {
  const days = daysSinceJ2000(now);
  const degPerDay = 360 / planet.orbitalPeriodDays;
  const angle = (planet.meanLongitudeDegJ2000 + days * degPerDay) % 360;
  return angle < 0 ? angle + 360 : angle;
}

export function createPlanetDatabase() {
  return planetRows.map((planet) => ({
    ...planet,
    unlocked: false,
  }));
}
