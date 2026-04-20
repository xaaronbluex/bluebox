const rarityWeight = {
  N: 50,
  R: 30,
  SR: 15,
  UR: 4,
  EXR: 1,
};

export function drawFromPool(items) {
  const weightedPool = items.map((item) => ({
    item,
    weight: rarityWeight[item.rarity] ?? 1,
  }));

  const total = weightedPool.reduce((sum, row) => sum + row.weight, 0);
  let roll = Math.random() * total;

  for (const row of weightedPool) {
    roll -= row.weight;
    if (roll <= 0) return row.item;
  }

  return weightedPool[weightedPool.length - 1].item;
}
