export const manualColorMap = [
  ["#99ff00", "#66ff00", "#33ff00", "#66ff33", "#33cc00", "#00cc33", "#33ff66", "#00ff33", "#00ff66"],
  ["#ccff00", "#99ff33", "#99ff66", "#66cc33", "#339900", "#009933", "#33cc66", "#66ff99", "#33ff99", "#00ff99"],
  ["#ccff33", "#ccff66", "#66cc00", "#00ff00", "#00cc00", "#009900", "#006600", "#003300", "#00cc66", "#66ffcc", "#00ffcc"],
  ["#99cc00", "#99cc33", "#333300", "#336600", "#33ff33", "#33cc33", "#339933", "#336633", "#006633", "#00ffff", "#33cc99", "#33ffcc"],
  ["#cc9900", "#669900", "#666600", "#666633", "#669933", "#66ff66", "#66cc66", "#669966", "#339966", "#33ffff", "#00cccc", "#009966", "#00cc99"],
  ["#ffcc33", "#996600", "#999900", "#999933", "#999966", "#99cc66", "#99ff99", "#99cc99", "#66cc99", "#66ffff", "#33cccc", "#009999", "#006699", "#0099cc"],
  ["#ffcc00", "#cc9933", "#cccc00", "#cccc33", "#cccc66", "#cccc99", "#ccff99", "#ccffcc", "#99ffcc", "#99ffff", "#66cccc", "#339999", "#006666", "#3399cc", "#33ccff"],
  ["#ff9900", "#ffcc66", "#ffff00", "#ffff33", "#ffff66", "#ffff99", "#ffffcc", "#999999", "#666666", "#ccffff", "#99cccc", "#669999", "#336666", "#003333", "#66ccff", "#00ccff"],
  ["#ff6600", "#ff9933", "#cc6600", "#663300", "#996633", "#cc9966", "#ffcc99", "#cccccc", "RAINBW", "#333333", "#99ccff", "#6699cc", "#336699", "#003366", "#0066cc", "#3399ff", "#0099ff"],
  ["#ff3300", "#ff9966", "#330000", "#663333", "#996666", "#cc9999", "#ffcccc", "#ffffff", "#000000", "#ccccff", "#9999ff", "#6666ff", "#3333ff", "#0000ff", "#6699ff", "#0066ff"],
  ["#ff6633", "#cc6633", "#660000", "#993333", "#cc6666", "#ff9999", "#ff99cc", "#ffccff", "#cc99ff", "#9999cc", "#6666cc", "#3333cc", "#0000cc", "#3366cc", "#0033ff"],
  ["#cc3300", "#993300", "#990000", "#cc3333", "#ff6666", "#cc6699", "#cc99cc", "#ff99ff", "#9966cc", "#666699", "#333399", "#000099", "#003399", "#3366ff"],
  ["#cc0033", "#990033", "#cc0000", "#ff3333", "#993366", "#996699", "#cc66cc", "#ff66ff", "#663399", "#333366", "#000066", "#330099", "#0033cc"],
  ["#ff3366", "#cc3366", "#ff0000", "#660033", "#663366", "#993399", "#cc33cc", "#ff33ff", "#330066", "#000033", "#6633cc", "#3300cc"],
  ["#ff0033", "#ff6699", "#cc0066", "#330033", "#660066", "#990099", "#cc00cc", "#ff00ff", "#6600cc", "#9966ff", "#6633ff"],
  ["#ff0066", "#ff3399", "#ff66cc", "#cc3399", "#990066", "#660099", "#9933cc", "#cc66ff", "#9933ff", "#3300ff"],
  ["#ff0099", "#ff00cc", "#ff33cc", "#cc0099", "#9900cc", "#cc33ff", "#cc00ff", "#9900ff", "#6600ff"],
];

export function getColorRarity(hexStr) {
  if (hexStr === "RAINBW") return "EXR";
  const upperHex = hexStr.toUpperCase();
  if (upperHex === "#000000" || upperHex === "#FFFFFF") return "UR";
  if (/^#(.)\1{5}$/i.test(hexStr)) return "SR";

  const r = parseInt(hexStr.slice(1, 3), 16);
  const g = parseInt(hexStr.slice(3, 5), 16);
  const b = parseInt(hexStr.slice(5, 7), 16);
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  return lum > 128 ? "R" : "N";
}

export function createColorDatabase() {
  let idCounter = 0;
  return manualColorMap.flatMap((row) =>
    row.map((hex) => ({
      id: idCounter++,
      hex,
      rarity: getColorRarity(hex),
      unlocked: false,
    }))
  );
}

export function createWebSafeRectGrid() {
  const steps = ["FF", "CC", "99", "66", "33", "00"];
  const result = [];
  for (let gridRow = 0; gridRow < 12; gridRow += 1) {
    const blockRow = Math.floor(gridRow / 6);
    const r = gridRow % 6;
    for (let gridCol = 0; gridCol < 18; gridCol += 1) {
      const blockCol = Math.floor(gridCol / 6);
      const c = gridCol % 6;
      const blockIndex = blockRow * 3 + blockCol;
      const B = steps[blockIndex];
      const R = steps[r];
      const G = steps[c];
      result.push(`#${R}${G}${B}`);
    }
  }
  return result;
}
