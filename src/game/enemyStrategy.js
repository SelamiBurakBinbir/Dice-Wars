// enemyStrategy.js
// ----------------------------------------------------
import { territories } from "./map.js";
import { getLargestConnectedComponentSize } from "./gameLogic.js";

/**
 * Yaklaşık saldırı kazanma ihtimali (gerçek zar olasılık hesabı yerine basit bir model).
 */
function approximateSuccessProbability(attackerDice, defenderDice) {
  if (attackerDice < defenderDice) {
    const diff = defenderDice - attackerDice;
    return Math.max(0, 0.45 - diff * 0.15);
  } else if (attackerDice === defenderDice) {
    return 0.4;
  } else {
    const diff = attackerDice - defenderDice;
    return Math.min(1, 0.6 + diff * 0.15);
  }
}

/**
 * Kendi küme büyümesi (myGain) ve rakibin kaybı (enemyLoss) hesaplar.
 * - AI bir hücreyi geçici olarak ele geçirince:
 *   - AI'nın en büyük kümesi ne kadar büyüyor?
 *   - O hücrenin savunucusunun en büyük kümesi ne kadar küçülüyor?
 */
function computeMyGainAndEnemyLoss(aiId, target) {
  const oldSizeAI = getLargestConnectedComponentSize(aiId);
  const defenderId = target.owner;

  let oldSizeEnemy = 0;
  if (defenderId !== aiId) {
    oldSizeEnemy = getLargestConnectedComponentSize(defenderId);
  }

  // Geçici sahiplik
  const originalOwner = target.owner;
  target.owner = aiId;

  const newSizeAI = getLargestConnectedComponentSize(aiId);
  let newSizeEnemy = 0;
  if (defenderId !== aiId) {
    newSizeEnemy = getLargestConnectedComponentSize(defenderId);
  }

  // Geri al
  target.owner = originalOwner;

  const myGain = newSizeAI - oldSizeAI;
  const enemyLoss = oldSizeEnemy - newSizeEnemy;
  return { myGain, enemyLoss };
}

/**
 * Bir territory'nin ait olduğu "küçük düşman kümesi" boyutunu bulmak için
 * BFS/DFS ile tarama yapıyoruz.
 * Yani "target" hücresinin owner'ına ait, target ile bağlantılı kaç hücre var?
 */
function getEnemyClusterSize(target) {
  const ownerId = target.owner;
  if (ownerId == null) return 0;

  let visited = new Set();
  let queue = [target];
  visited.add(target.id);

  let count = 1;

  while (queue.length > 0) {
    const current = queue.shift();
    for (let nid of current.neighbors) {
      const nTerr = territories.find((t) => t.id === nid);
      if (!nTerr) continue;
      // Aynı owner'a ait ve henüz ziyaret edilmemişse
      if (nTerr.owner === ownerId && !visited.has(nTerr.id)) {
        visited.add(nTerr.id);
        queue.push(nTerr);
        count++;
      }
    }
  }

  return count;
}

/**
 * Kompaktlık: hedef hücrenin komşularından kaçı bana (aiId) ait?
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
 * Saldırıyı yapan AI'nın en büyük küme boyutuna göre,
 * "küçük düşman kümesi" eşik değerini dinamik belirler.
 *  - Örnek:
 *    - AI <5 hücreye sahipse => eşik=1
 *    - AI <10 hücreye sahipse => eşik=2
 *    - AI <15 => 3
 *    - AI <20 => 4
 *    - Aksi => 5
 */
function getDynamicSmallClusterThreshold(attackerLargestSize) {
  const scale = 5;
  let raw = Math.floor(attackerLargestSize / scale);
  if (raw < 1) raw = 1; // en az 1 olsun
  return raw;
}

/**
 * BFS + Greedy yaklaşımıyla çok adımlı saldırı araması.
 *
 * Öncelik sıralaması:
 *  1) Büyük Birleşme (myGain >= bigMergeThreshold) => en yüksek skor
 *  2) Diğer durumlarda: myGain + compactness (daha önemli) + enemyLoss (daha az önemli) + smallClusterBonus
 *
 * smallClusterBonus: hedefin ait olduğu düşman kümesi boyutu, "dinamik" eşiğin altındaysa eklenir.
 *
 * Parametre açıklamaları:
 *  - attackerTerritory: Saldırıya başlayan hücre (AI'ya ait)
 *  - maxDepth: Kaç adım ileriyi inceleyeceğiz
 *  - pruneThreshold: Olasılık bu değerin altına düşerse dal kes
 *  - bigMergeThreshold: myGain bu değeri aşarsa "büyük birleşme" say => en önemli
 *  - compactnessWeight: kompaktlığa verilen ağırlık
 *  - enemyLossWeight: rakibi zayıflatmaya verilen ağırlık (compactness'tan daha az)
 *  - smallClusterWeight: küçük düşman kümesi bonusuna verilen ağırlık
 */
export function chooseAttackWithGreedyBFS(
  attackerTerritory,
  maxDepth = 3,
  pruneThreshold = 0.05,
  bigMergeThreshold = 3,
  compactnessWeight = 1.0,
  enemyLossWeight = 0.5,
  smallClusterWeight = 1.0
) {
  // Eğer saldıran hücrede 2'den az zar varsa saldırı yapılamaz
  if (attackerTerritory.dice < 2) return null;

  const aiId = attackerTerritory.owner;

  // Saldırıyı yapanın en büyük küme boyutu (AI)
  const attackerLargestSize = getLargestConnectedComponentSize(aiId);
  // Buna göre "küçük düşman kümesi" eşiğini dinamik hesapla
  const dynamicSmallThreshold =
    getDynamicSmallClusterThreshold(attackerLargestSize);

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
    // best-first => en yüksek EV'li durumu öne al
    frontier.sort((a, b) => {
      const evA = a.totalGain * a.successProb;
      const evB = b.totalGain * b.successProb;
      return evB - evA;
    });
    const current = frontier.shift();
    const currentEV = current.totalGain * current.successProb;

    // En iyiyi güncelle
    if (currentEV > bestValue) {
      bestValue = currentEV;
      // path[0] = attackerTerritory, saldırı hedefleri path[1..]
      bestPath = current.path.slice(1);
    }

    if (current.depth >= maxDepth) {
      continue;
    }

    const lastCell = current.path[current.path.length - 1];
    if (!lastCell) continue;

    // Basit kontrol
    if (attackerTerritory.dice < 2) {
      continue;
    }

    // Komşu düşman hücreleri bul
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

      // 1) myGain & enemyLoss
      const { myGain, enemyLoss } = computeMyGainAndEnemyLoss(aiId, nbr);

      // 2) Küçük düşman kümesi bonus
      const clusterSize = getEnemyClusterSize(nbr);
      let smallClusterBonus = 0;
      if (clusterSize <= dynamicSmallThreshold) {
        // Örn: (dynamicSmallThreshold - clusterSize + 1)
        // clusterSize=1 => bonus = dynamicSmallThreshold
        smallClusterBonus = dynamicSmallThreshold - clusterSize + 1;
      }

      // 3) Kompaktlık
      let compScore = 0;

      // "Büyük birleşme" kontrolü
      // Eğer myGain >= bigMergeThreshold => bu hamle "en yüksek öncelik"
      let score = 0;
      if (myGain >= bigMergeThreshold) {
        // "büyük birleşme" => her şeyi gölgede bırak
        // Burada "1000" gibi büyük bir taban ekleyerek
        // her türlü diğer faktörün altında kalmasını engelliyoruz
        score = 1000 + myGain;
      } else {
        // Normal durum: myGain + compactness + enemyLoss + smallClusterBonus
        compScore = computeCompactness(aiId, nbr) * compactnessWeight;
        score =
          myGain +
          compScore +
          enemyLossWeight * enemyLoss +
          smallClusterWeight * smallClusterBonus;
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
