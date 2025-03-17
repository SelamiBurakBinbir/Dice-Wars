import { store } from "./store.js";
import { players, addReinforcements, checkAnyPlayerWin } from "./gameLogic.js";
import { territories } from "./map.js";
import {
  updateSidebar,
  updateReinforcementInfo,
  updateAttackResultsUI,
  updateTerritoryUI,
} from "..ui/ui.js";
import { doAttackSequence } from "./attacks.js";

// Yeni fonksiyon
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
    // İnsan oyuncu ise, eğer skipAlert=false ise uyarı ver
    if (store.skipAlert) {
      store.skipAlert = false;
    } else {
      alert(players[currentId].name + " turu başladı!");
    }
  }
}

/**
 * Yapay zekâ (enemy) oyuncunun saldırı döngüsü
 * "kendi topraklarını kompakt tutma" faktörünü de hesaba katıyor.
 */
export async function doAiTurn(aiId) {
  let canAttack = true;
  while (canAttack) {
    canAttack = false;

    // Zar sayısı >=2 olan tüm AI hücreleri
    let aiTerrs = territories.filter((t) => t.owner === aiId && t.dice > 1);

    for (let et of aiTerrs) {
      // BFS + Greedy saldırı planı
      // maxDepth=3, pruneThreshold=0.05, enemyLossWeight=0.5, compactnessWeight=0.2
      // bigMergeThreshold=3 => eğer myGain >= 3 ise kompaktlık eklenmesin
      const choice = chooseAttackWithGreedyBFS(et, 3, 0.05, 0.5, 0.2, 3);
      // { path, expectedValue } veya null

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
