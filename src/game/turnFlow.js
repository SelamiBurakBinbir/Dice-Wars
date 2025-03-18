// turnFlow.js
// ---------------------------------------

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

// Yeni fonksiyon (yukarıdaki BFS + Greedy yaklaşımı)
import { chooseAttackWithGreedyBFS } from "./enemyStrategy.js";

/**
 * İnsan oyuncu "Turu Bitir" dediğinde veya
 * Yapay zekâ saldırılarını bitirdiğinde bu fonksiyon çağrılır.
 */
export function endPlayerTurn() {
  const currentId = store.currentTurn;

  // Tur sonu ek zarlar
  addReinforcements(currentId);
  territories.filter((t) => t.owner === currentId).forEach(updateTerritoryUI);

  updateSidebar();
  updateReinforcementInfo();

  // Sonra sıradaki oyuncuya geç
  nextPlayer();
}

/**
 * Sıradaki oyuncuya geç. (currentTurn++ mod players.length)
 */
function nextPlayer() {
  store.currentTurn = (store.currentTurn + 1) % players.length;

  // Oyun bitti mi?
  if (checkGameOver()) return;

  const currentId = store.currentTurn;
  const owned = territories.filter((t) => t.owner === currentId);

  // Eğer bu oyuncunun hiç toprağı yoksa (elenmiş), direkt pas
  if (owned.length === 0) {
    endPlayerTurn();
    return;
  }

  // Güncel durumu göster
  updateSidebar();
  updateReinforcementInfo();
  updateAttackResultsUI();

  // Bu oyuncu AI mı?
  if (!players[currentId].isHuman) {
    doAiTurn(currentId);
  } else {
    if (store.skipAlert) {
      store.skipAlert = false;
    } else {
      alert(players[currentId].name + " turu başladı!");
    }
  }
}

/**
 * Yapay zekâ (enemy) oyuncunun saldırı döngüsü:
 *  - BFS + Greedy
 *  - Büyük birleşme önceliği
 *  - Compactness > EnemyLoss
 *  - Küçük düşman kümesi bonusu, saldırıyı yapanın boyutuna göre
 */
export async function doAiTurn(aiId) {
  let canAttack = true;
  while (canAttack) {
    canAttack = false;

    // Zar sayısı >=2 olan tüm AI hücreleri
    let aiTerrs = territories.filter((t) => t.owner === aiId && t.dice > 1);

    for (let et of aiTerrs) {
      // Parametre örneği:
      // maxDepth=3, pruneThreshold=0.05,
      // bigMergeThreshold=3, compactnessWeight=1.0,
      // enemyLossWeight=0.5, smallClusterWeight=1.0
      const choice = chooseAttackWithGreedyBFS(
        et,
        3,
        0.05,
        3,
        1.0, // compactnessWeight
        0.5, // enemyLossWeight
        1.0 // smallClusterWeight
      );

      if (choice && choice.path && choice.path.length > 0) {
        // path içindeki her hedefe sırayla saldır
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

/**
 * Oyun tamamen bitti mi? (Tüm bölgeleri tek elde mi, vs.?)
 */
export function checkGameOver() {
  const winnerId = checkAnyPlayerWin();
  if (winnerId !== -1) {
    const turnIndicatorEl = document.getElementById("turnIndicator");
    if (turnIndicatorEl) {
      turnIndicatorEl.textContent = players[winnerId].name + " kazandı!";
    }
    const reinforcementInfoEl = document.getElementById("reinforcementInfo");
    if (reinforcementInfoEl) reinforcementInfoEl.innerHTML = "";
    return true;
  }
  return false;
}
