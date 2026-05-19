/** Accent colors & relief heights for fog-of-war reveal (keyed by dataofjapan `id`). */
const CYBER_PALETTE = [
  "#22d3ee",
  "#00e6b8",
  "#a78bfa",
  "#4ade80",
  "#fb7185",
  "#fbbf24",
  "#38bdf8",
  "#e879f9",
];

const ELEVATION_OVERRIDES = {
  1: 5200,
  2: 2100,
  3: 1900,
  4: 1600,
  5: 1500,
  6: 1400,
  7: 1800,
  8: 1200,
  9: 2000,
  10: 1300,
  11: 1100,
  12: 900,
  13: 800,
  14: 1200,
  15: 2400,
  16: 3100,
  17: 2700,
  18: 2200,
  19: 3800,
  20: 3200,
  21: 2800,
  22: 2600,
  23: 1100,
  24: 1400,
  25: 1300,
  26: 1200,
  27: 900,
  28: 1900,
  29: 1700,
  30: 1600,
  31: 1400,
  32: 1300,
  33: 1200,
  34: 1100,
  35: 1000,
  36: 1900,
  37: 1100,
  38: 1000,
  39: 2200,
  40: 900,
  41: 1000,
  42: 1100,
  43: 1700,
  44: 1600,
  45: 1500,
  46: 1900,
  47: 1500,
};

export function getPrefectureAccent(id) {
  const n = Number(id) || 0;
  return CYBER_PALETTE[n % CYBER_PALETTE.length];
}

export function getPrefectureElevation(id) {
  const n = Number(id);
  if (ELEVATION_OVERRIDES[n]) return ELEVATION_OVERRIDES[n];
  return 1200 + (n % 11) * 350;
}

export const JAPAN_PREFECTURES_GEOJSON_URL =
  "https://raw.githubusercontent.com/dataofjapan/land/master/japan.geojson";

export const JAPAN_PREFECTURES_TOPOJSON_URL =
  "https://raw.githubusercontent.com/dataofjapan/land/master/japan.topojson";
