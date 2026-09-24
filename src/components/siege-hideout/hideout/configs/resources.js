/** Hideout resource defs — keep ≤3 kinds. */

export const RESOURCES = {
  supplies: {
    id: "supplies",
    label: "Supplies",
    short: "Sup",
    hint: "Wood · rations · cordage",
    color: "#8B6A45",
  },
  stone: {
    id: "stone",
    label: "Stone",
    short: "Stn",
    hint: "Quarried stone · scrap iron",
    color: "#7A8694",
  },
  marks: {
    id: "marks",
    label: "Red Seals",
    short: "Seal",
    hint: "Battle Marks from Siege + Keep",
    color: "#B7332E",
  },
};

export const RESOURCE_IDS = Object.keys(RESOURCES);

export function emptyResources() {
  return { supplies: 0, stone: 0, marks: 0 };
}
