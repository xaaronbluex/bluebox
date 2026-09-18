/** Brief palette tokens for Siege Run / Hideout (print diorama). */

export const PALETTE = {
  paleAsh: "#D8D6CE",
  parchment: "#E8DEB5",
  midGray: "#8D8D87",
  charcoal: "#1D2020",
  charcoalMid: "#4A4B49",
  redSignal: "#B7332E",
  redShadow: "#6F2525",
  brass: "#C69A43",
  playerAccent: "#6B7A86",
};

/** Ordered-dither target swatches (flat value planes → print look). */
export const DITHER_PALETTE = [
  PALETTE.paleAsh,
  PALETTE.parchment,
  PALETTE.midGray,
  PALETTE.charcoalMid,
  PALETTE.charcoal,
  PALETTE.redSignal,
  PALETTE.redShadow,
  PALETTE.brass,
  PALETTE.playerAccent,
];

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export const DITHER_RGB = DITHER_PALETTE.map(hexToRgb);
