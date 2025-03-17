import { territories } from "./map.js";

export let players = [];

export let lastAttackResults = null;

export function setPlayers(newPlayers) {
  players = newPlayers;
}

export function assignOwners() {
  territories.forEach((t) => {
    t.owner = Math.floor(Math.random() * players.length);
  });

  const anyHumanIndex = players.findIndex((p) => p.isHuman);

  if (anyHumanIndex !== -1) {
    const hasAny = territories.some((t) => t.owner === anyHumanIndex);

    if (!hasAny) {
      territories[0].owner = anyHumanIndex;
    }
  }
}

export function performAttack(attacker, defender) {
  const attackerRolls = rollMultipleDice(attacker.dice);
  const defenderRolls = rollMultipleDice(defender.dice);
  const attackerSum = attackerRolls.reduce((a, b) => a + b, 0);
  const defenderSum = defenderRolls.reduce((a, b) => a + b, 0);

  lastAttackResults = {
    attackerId: attacker.owner,
    attackerRolls,
    attackerSum,
    defenderId: defender.owner,
    defenderRolls,
    defenderSum,
  };

  if (attackerSum > defenderSum) {
    let diceToMove = attacker.dice - 1;

    if (diceToMove < 1) diceToMove = 1;

    attacker.dice = 1;
    defender.owner = attacker.owner;
    defender.dice = diceToMove;
  } else {
    attacker.dice = 1;
  }
}

export function addReinforcements(playerId) {
  const largestSize = getLargestConnectedComponentSize(playerId);

  if (largestSize <= 0) return;

  let owned = territories.filter((t) => t.owner === playerId);
  let extraDice = largestSize;

  while (extraDice > 0) {
    let possible = owned.filter((t) => t.dice < 10);

    if (possible.length === 0) break;

    let chosen = possible[Math.floor(Math.random() * possible.length)];
    chosen.dice++;
    extraDice--;
  }
}

export function getLargestConnectedComponentSize(playerId) {
  const owned = territories.filter((t) => t.owner === playerId);

  if (owned.length === 0) return 0;

  let visited = new Set();
  let maxSize = 0;

  for (let terr of owned) {
    if (!visited.has(terr.id)) {
      let size = bfsSize(terr, owned, visited);

      if (size > maxSize) {
        maxSize = size;
      }
    }
  }
  return maxSize;
}

export function checkAnyPlayerWin() {
  const total = territories.length;
  let countByOwner = new Map();

  for (let t of territories) {
    countByOwner.set(t.owner, (countByOwner.get(t.owner) || 0) + 1);
  }

  for (let [ownerId, cnt] of countByOwner.entries()) {
    if (cnt === total) {
      return ownerId;
    }
  }
  return -1;
}

export function clearLastAttackResults() {
  lastAttackResults = null;
}

function bfsSize(start, owned, visited) {
  let queue = [start];
  visited.add(start.id);

  let count = 1;
  const ownedSet = new Set(owned.map((o) => o.id));

  while (queue.length > 0) {
    let current = queue.shift();

    for (let nId of current.neighbors) {
      if (!visited.has(nId) && ownedSet.has(nId)) {
        visited.add(nId);
        let nTerr = territories.find((t) => t.id === nId);

        if (nTerr) {
          queue.push(nTerr);
          count++;
        }
      }
    }
  }
  return count;
}

function rollMultipleDice(num) {
  let results = [];

  for (let i = 0; i < num; i++) {
    results.push(Math.floor(Math.random() * 6) + 1);
  }

  return results;
}
