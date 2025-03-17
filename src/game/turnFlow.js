import { store } from "./store.js";
import { players, addReinforcements, checkAnyPlayerWin } from "./gameLogic.js";
import { territories } from "./map.js";
import {
  updateSidebar,
  updateReinforcementInfo,
  updateAttackResultsUI,
  updateTerritoryUI,
} from "../ui/ui.js";
import { doAttackSequence } from "./attacks.js";
import { chooseAttackWithGreedyBFS } from "./enemyStrategy.js";

export function endPlayerTurn() {
  const currentId = store.currentTurn;
  addReinforcements(currentId);
  territories.filter((t) => t.owner === currentId).forEach(updateTerritoryUI);
  updateSidebar();
  updateReinforcementInfo();
  nextPlayer();
}

function nextPlayer() {
  store.currentTurn = (store.currentTurn + 1) % players.length;
  if (checkGameOver()) return;
  const currentId = store.currentTurn;
  const owned = territories.filter((t) => t.owner === currentId);
  if (owned.length === 0) {
    endPlayerTurn();
    return;
  }
  updateSidebar();
  updateReinforcementInfo();
  updateAttackResultsUI();
  if (!players[currentId].isHuman) {
    doAiTurn(currentId);
  } else {
    if (store.skipAlert) {
      store.skipAlert = false;
    } else {
      alert(players[currentId].name + "'s turn!");
    }
  }
}

export async function doAiTurn(aiId) {
  let canAttack = true;
  while (canAttack) {
    canAttack = false;
    let aiTerrs = territories.filter((t) => t.owner === aiId && t.dice > 1);
    for (let et of aiTerrs) {
      const choice = chooseAttackWithGreedyBFS(et, 3, 0.05, 0.5);
      if (choice && choice.path && choice.path.length > 0) {
        for (let target of choice.path) {
          if (et.dice < 2) break;
          await doAttackSequence(et, target, true);
          updateSidebar();
          updateReinforcementInfo();
          updateAttackResultsUI();
          if (checkGameOver()) return;
        }
        canAttack = true;
        break;
      }
    }
  }
  endPlayerTurn();
}

export function checkGameOver() {
  const winnerId = checkAnyPlayerWin();
  if (winnerId !== -1) {
    const turnIndicatorEl = document.getElementById("turnIndicator");
    if (turnIndicatorEl) {
      turnIndicatorEl.textContent = players[winnerId].name + " won the game!";
    }
    const reinforcementInfoEl = document.getElementById("reinforcementInfo");
    if (reinforcementInfoEl) reinforcementInfoEl.innerHTML = "";
    return true;
  }
  return false;
}
