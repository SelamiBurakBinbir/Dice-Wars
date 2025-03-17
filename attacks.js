import { store, NORMAL_PHASE_TIME, FAST_PHASE_TIME } from "./store.js";
import { performAttack } from "./gameLogic.js";
import {
  highlightAttack,
  removeHighlight,
  updateMoveCounter,
  updateSidebar,
  updateReinforcementInfo,
  updateAttackResultsUI,
} from "./ui.js";
import { checkGameOver } from "./turnFlow.js";
import { delay } from "./delays.js";
import { updateTerritoryUI } from "./ui.js";

export async function doAttackSequence(attacker, defender, isEnemy) {
  let phaseTime =
    isEnemy && store.fastForwardEnabled ? FAST_PHASE_TIME : NORMAL_PHASE_TIME;

  store.lockedTerritories.add(attacker.id);
  store.lockedTerritories.add(defender.id);

  highlightAttack(attacker, defender);
  await delay(phaseTime);

  performAttack(attacker, defender);

  store.moveCount++;
  updateMoveCounter();

  updateSidebar();
  updateReinforcementInfo();
  updateAttackResultsUI();

  updateTerritoryUI(attacker);
  updateTerritoryUI(defender);

  phaseTime =
    isEnemy && store.fastForwardEnabled ? FAST_PHASE_TIME : NORMAL_PHASE_TIME;

  if (isEnemy) {
    await delay(phaseTime);
    removeHighlight(attacker, defender);
    checkGameOver();
  } else {
    delay(phaseTime).then(() => {
      removeHighlight(attacker, defender);
      checkGameOver();
    });
  }

  store.lockedTerritories.delete(attacker.id);
  store.lockedTerritories.delete(defender.id);
}
