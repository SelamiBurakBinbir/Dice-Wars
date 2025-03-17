import { territories } from "./map.js";
import { getLargestConnectedComponentSize } from "./gameLogic.js";

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

export function chooseAttackWithGreedyBFS(
  attackerTerritory,
  maxDepth = 3,
  pruneThreshold = 0.05,
  enemyLossWeight = 0.5
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
    frontier.sort((a, b) => {
      const evA = a.totalGain * a.successProb;
      const evB = b.totalGain * b.successProb;
      return evB - evA;
    });

    const current = frontier.shift();
    const currentEV = current.totalGain * current.successProb;

    if (currentEV > bestValue) {
      bestValue = currentEV;
      bestPath = current.path.slice(1);
    }

    if (current.depth >= maxDepth) {
      continue;
    }

    const lastCell = current.path[current.path.length - 1];

    if (!lastCell) continue;
    if (attackerTerritory.dice < 2) {
      continue;
    }

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

      const { myGain, enemyLoss } = computeMyGainAndEnemyLoss(aiId, nbr);
      const score = myGain + enemyLossWeight * enemyLoss;
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
