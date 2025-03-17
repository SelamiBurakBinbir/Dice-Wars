import { territories } from "./map.js";
import { getLargestConnectedComponentSize } from "./gameLogic.js";

/**
 * Saldırı kazanma ihtimali (yaklaşık).
 */
function approximateSuccessProbability(attackerDice, defenderDice) {
  if (attackerDice < defenderDice) {
    const diff = defenderDice - attackerDice;
    return Math.max(0, 0.45 - diff * 0.15); // diff=1 => ~%30, diff=2 => ~%15 ...
  } else if (attackerDice === defenderDice) {
    return 0.4; // eşit zar => ~%40
  } else {
    const diff = attackerDice - defenderDice;
    return Math.min(1, 0.6 + diff * 0.15); // diff=1 => ~%60, diff=2 => ~%75 ...
  }
}

/**
 * Kaç komşu hücremin bana (aiId) ait olduğunu hesaplar.
 * Basit bir "kompaktlık" ölçüsü:
 *  - Yüksek sayı => hedef hücreyi alırsam etrafında benim daha çok hücrem var => derli toplu
 *  - Düşük sayı (özellikle 1) => ince uzayan, tek bağlantılı bir genişleme
 */
function computeCompactness(aiId, target) {
  let count = 0;
  for (let nid of target.neighbors) {
    const nTerr = territories.find((x) => x.id === nid);
    if (nTerr && nTerr.owner === aiId) {
      count++;
    }
  }
  return count;
}

/**
 * Hem saldıran AI'nın en büyük kümesindeki artışı (myGain),
 * hem de hedefin sahibinin kümesindeki azalışı (enemyLoss) ölçer.
 */
function computeMyGainAndEnemyLoss(aiId, target) {
  const oldSizeAI = getLargestConnectedComponentSize(aiId);
  const defenderId = target.owner;

  let oldSizeEnemy = 0;
  if (defenderId !== aiId) {
    oldSizeEnemy = getLargestConnectedComponentSize(defenderId);
  }

  const originalOwner = target.owner;
  target.owner = aiId;

  const newSizeAI = getLargestConnectedComponentSize(aiId);
  let newSizeEnemy = 0;
  if (defenderId !== aiId) {
    newSizeEnemy = getLargestConnectedComponentSize(defenderId);
  }

  target.owner = originalOwner;

  const myGain = newSizeAI - oldSizeAI;
  const enemyLoss = oldSizeEnemy - newSizeEnemy;

  return { myGain, enemyLoss };
}

/**
 * BFS + Greedy aramayla:
 *  - Kendi büyük kümesini büyütme (myGain)
 *  - Rakibin bütünlüğünü bozma (enemyLoss)
 *  - Kendi topraklarımı "derli toplu" tutma (compactness)
 * gibi faktörleri dikkate alarak çok adımlı saldırı path'i seçer.
 *
 * @param {object} attackerTerritory - AI'ya ait, saldırı başlatılan hücre
 * @param {number} maxDepth - Kaç adım derine inilecek
 * @param {number} pruneThreshold - Olasılık altına düşerse dal kes
 * @param {number} enemyLossWeight - Rakibin kaybına ne kadar önem veriliyor
 * @param {number} compactnessWeight - "Derli toplu" olmayı ne kadar önemsiyoruz
 * @param {number} bigMergeThreshold - myGain bu değerden büyükse "büyük birleşme" say, compactness'ı yok say
 */
export function chooseAttackWithGreedyBFS(
  attackerTerritory,
  maxDepth = 3,
  pruneThreshold = 0.05,
  enemyLossWeight = 0.5,
  compactnessWeight = 0.2,
  bigMergeThreshold = 3
) {
  if (attackerTerritory.dice < 2) return null;

  const aiId = attackerTerritory.owner;

  const initialState = {
    path: [attackerTerritory],
    successProb: 1.0,
    totalGain: 0,
    depth: 0,
  };

  let frontier = [initialState];

  let bestValue = -Infinity;
  let bestPath = null;

  while (frontier.length > 0) {
    // best-first => en yüksek EV (expectedValue) önce
    frontier.sort((a, b) => {
      const evA = a.totalGain * a.successProb;
      const evB = b.totalGain * b.successProb;
      return evB - evA;
    });
    const current = frontier.shift();
    const currentEV = current.totalGain * current.successProb;

    // En iyi güncelle
    if (currentEV > bestValue) {
      bestValue = currentEV;
      bestPath = current.path.slice(1);
    }

    // Derinlik sınırı
    if (current.depth >= maxDepth) {
      continue;
    }

    const lastCell = current.path[current.path.length - 1];
    if (!lastCell) continue;

    // Basit kontrol
    if (attackerTerritory.dice < 2) {
      continue;
    }

    // Komşular
    const neighbors = lastCell.neighbors
      .map((nid) => territories.find((x) => x.id === nid))
      .filter(
        (nbr) =>
          nbr &&
          nbr.owner !== aiId &&
          nbr.dice <= attackerTerritory.dice &&
          !current.path.includes(nbr)
      );

    for (let nbr of neighbors) {
      const sp = approximateSuccessProbability(
        attackerTerritory.dice,
        nbr.dice
      );
      const newProb = current.successProb * sp;
      if (newProb < pruneThreshold) {
        continue;
      }

      // myGain + enemyLoss
      const { myGain, enemyLoss } = computeMyGainAndEnemyLoss(aiId, nbr);

      // Eğer bu saldırı "büyük birleşme" sağlıyorsa (myGain >= bigMergeThreshold)
      // kompaktlık eklemeden doğrudan skoru hesapla
      let score = myGain + enemyLossWeight * enemyLoss;

      if (myGain < bigMergeThreshold) {
        // Büyük birleşme değilse => kompaktlık ekle
        const comp = computeCompactness(aiId, nbr);
        // comp: hedefin komşuları içinde AI'ya ait hücre sayısı
        // 0 => tamamen tek bağlantı, 1 => kıl payı, 2.. => daha derli toplu
        score += compactnessWeight * comp;
      }

      const newGain = current.totalGain + score;

      const newState = {
        path: [...current.path, nbr],
        successProb: newProb,
        totalGain: newGain,
        depth: current.depth + 1,
      };

      frontier.push(newState);
    }
  }

  if (bestValue <= 0) {
    return null;
  }

  return {
    path: bestPath,
    expectedValue: bestValue,
  };
}
