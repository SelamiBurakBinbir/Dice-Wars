import { store } from "./store.js";
import { players } from "./gameLogic.js";
import { territories } from "./map.js";
import {
  updateSidebar,
  updateReinforcementInfo,
  updateAttackResultsUI,
  getTerritoryElement,
} from "./ui.js";
import { doAttackSequence } from "./attacks.js";
import { endPlayerTurn, checkGameOver, doAiTurn } from "./turnFlow.js";
import { skipDelay } from "./delays.js";
import { resetGame } from "./main.js";

export function initEventHandlers() {
  const boardEl = document.getElementById("game-board");

  boardEl.addEventListener("click", (e) => {
    const terrDiv = e.target.closest(".territory");
    if (!terrDiv) return;

    const terrId = terrDiv.getAttribute("data-territory-id");
    if (!terrId) return;

    const t = territories.find((tt) => tt.id === parseInt(terrId, 10));
    if (t) {
      onTerritoryClick(t);
    }
  });

  document
    .getElementById("endTurnBtn")
    .addEventListener("click", onEndTurnClick);
  document
    .getElementById("fastForwardBtn")
    .addEventListener("click", onFastForwardClick);
  document
    .getElementById("withdrawBtn")
    .addEventListener("click", onWithdrawClick);
  document
    .getElementById("howToPlayBtn")
    .addEventListener("click", showHowToPlay);
  document
    .getElementById("popupCloseBtn")
    .addEventListener("click", hideHowToPlay);

  const popupOverlay = document.getElementById("popupOverlay");

  popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
      hideHowToPlay();
    }
  });

  document
    .getElementById("goToIntroBtn")
    .addEventListener("click", onGoToIntroClick);
}

function onTerritoryClick(t) {
  if (checkGameOver()) return;

  const currentId = store.currentTurn;

  if (!players[currentId].isHuman) return;

  if (store.lockedTerritories.has(t.id)) {
    return;
  }

  if (!store.selectedTerritory) {
    if (t.owner === currentId) {
      store.selectedTerritory = t;
      getTerritoryElement(t.id)?.classList.add("selected");
    }
    return;
  }

  if (store.selectedTerritory.id === t.id) {
    getTerritoryElement(t.id)?.classList.remove("selected");
    store.selectedTerritory = null;
    return;
  }

  if (t.owner === store.selectedTerritory.owner) {
    getTerritoryElement(store.selectedTerritory.id)?.classList.remove(
      "selected"
    );
    store.selectedTerritory = t;
    getTerritoryElement(t.id)?.classList.add("selected");
    return;
  }

  if (
    store.selectedTerritory.owner !== t.owner &&
    store.selectedTerritory.neighbors.includes(t.id) &&
    store.selectedTerritory.dice >= 2
  ) {
    doAttackSequence(store.selectedTerritory, t, false);
    getTerritoryElement(store.selectedTerritory.id)?.classList.remove(
      "selected"
    );

    store.selectedTerritory = null;

    updateSidebar();
    updateReinforcementInfo();
    updateAttackResultsUI();

    return;
  }

  getTerritoryElement(store.selectedTerritory.id)?.classList.remove("selected");
  store.selectedTerritory = null;
}

function onEndTurnClick() {
  if (checkGameOver()) return;
  const currentId = store.currentTurn;

  if (!players[currentId].isHuman) return;
  endPlayerTurn();
}

function onFastForwardClick() {
  skipDelay();
  store.fastForwardEnabled = !store.fastForwardEnabled;
  updateSidebar();
}

async function onWithdrawClick() {
  const currentId = store.currentTurn;
  if (!players[currentId].isHuman) return;

  const confirmed = confirm("Are you sure you want to withdraw?");
  if (!confirmed) return;

  players[currentId].isHuman = false;

  fixAllAiNames();
  updateSidebar();
  updateReinforcementInfo();
  updateAttackResultsUI();

  alert("The player continue as " + players[currentId].name + "!");

  await doAiTurn(currentId);
}

function fixAllAiNames() {
  let maxNumber = 0;

  players.forEach((p) => {
    if (!p.isHuman) {
      const match = p.name.match(/^Bot\s+(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNumber) {
          maxNumber = num;
        }
      }
    }
  });

  players.forEach((p) => {
    if (!p.isHuman) {
      if (!/^Bot\s+\d+$/.test(p.name)) {
        p.name = "Bot " + (maxNumber + 1);
        maxNumber++;
      }
    }
  });
}

function onGoToIntroClick() {
  if (checkGameOver()) {
    resetGame();
  } else {
    const sure = confirm(
      "Are you sure you want to return to the home menu? The game will be ended."
    );

    if (!sure) return;
    resetGame();
  }
}

function showHowToPlay() {
  document.getElementById("popupOverlay").style.display = "flex";
}
function hideHowToPlay() {
  document.getElementById("popupOverlay").style.display = "none";
}
