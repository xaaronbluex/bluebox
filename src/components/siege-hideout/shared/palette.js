/** Brief palette tokens for Siege Run / Hideout (print diorama + parchment TD). */

export const PALETTE = {
  paleAsh: "#D8D6CE",
  parchment: "#E8DEB5",
  parchmentDeep: "#C9B889",
  parchmentEdge: "#A89068",
  midGray: "#8D8D87",
  charcoal: "#1D2020",
  charcoalMid: "#4A4B49",
  redSignal: "#B7332E",
  redShadow: "#6F2525",
  crimson: "#9C2A2A",
  brass: "#C69A43",
  playerAccent: "#6B7A86",
  // v3/v5 — royal blue for player / defenders (red reserved for enemies)
  navy: "#2A3A52",
  navyDeep: "#1A2436",
  navyMid: "#3D5168",
  royal: "#2E4A7A",
  royalLit: "#4A6A9A",
  // v2-derived midtones (print diorama — not neon)
  stoneLight: "#A8ADB3",
  stoneBlue: "#7A8694",
  slate: "#6A727C",
  slateDeep: "#4E565E",
  cliff: "#8A8680",
  cliffLit: "#A8A49C",
  earth: "#6B5344",
  earthDark: "#3E322A",
  grass: "#5A6B4A",
  moss: "#4A5C3E",
  pine: "#3E5238",
  wood: "#8B6A45",
  woodLight: "#A88455",
  woodDark: "#5C452E",
  tableWood: "#3A2A1C",
  tableLit: "#5A4030",
  skyHaze: "#C8C4B8",
  mist: "#B8B4A8",
  fireHot: "#F2E6A0",
  fireMid: "#E09A3A",
  fireCore: "#D45A28",
};

/** Ordered-dither target swatches (flat value planes → print look). */
export const DITHER_PALETTE = [
  PALETTE.paleAsh,
  PALETTE.parchment,
  PALETTE.parchmentDeep,
  PALETTE.parchmentEdge,
  PALETTE.midGray,
  PALETTE.stoneLight,
  PALETTE.stoneBlue,
  PALETTE.slate,
  PALETTE.slateDeep,
  PALETTE.cliff,
  PALETTE.cliffLit,
  PALETTE.charcoalMid,
  PALETTE.charcoal,
  PALETTE.redSignal,
  PALETTE.redShadow,
  PALETTE.crimson,
  PALETTE.brass,
  PALETTE.playerAccent,
  PALETTE.navy,
  PALETTE.navyDeep,
  PALETTE.navyMid,
  PALETTE.royal,
  PALETTE.royalLit,
  PALETTE.earth,
  PALETTE.earthDark,
  PALETTE.grass,
  PALETTE.moss,
  PALETTE.pine,
  PALETTE.wood,
  PALETTE.woodLight,
  PALETTE.woodDark,
  PALETTE.tableWood,
  PALETTE.tableLit,
  PALETTE.skyHaze,
  PALETTE.mist,
  PALETTE.fireHot,
  PALETTE.fireMid,
  PALETTE.fireCore,
];

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export const DITHER_RGB = DITHER_PALETTE.map(hexToRgb);
