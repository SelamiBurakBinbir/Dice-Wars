import { generateMap } from "./map.js";
import {
  setPlayers,
  assignOwners,
  players,
  clearLastAttackResults,
} from "./gameLogic.js";
import {
  initUI,
  createTerritoryElements,
  updateSidebar,
  updateReinforcementInfo,
  updateAttackResultsUI,
} from "./ui.js";
import { initEventHandlers } from "./playerInput.js";
import { store } from "./store.js";
import { doAiTurn } from "./turnFlow.js";
import { territories } from "./map.js";

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function createPlayers(playerCount, enemyCount, colors) {
  const result = [];
  for (let i = 0; i < playerCount; i++) {
    result.push({
      id: i,
      name: "Player " + (i + 1),
      color: colors[i],
      isHuman: true,
    });
  }

  let startIdx = playerCount;

  for (let i = 0; i < enemyCount; i++) {
    const enemyId = startIdx + i;

    result.push({
      id: enemyId,
      name: "Bot " + (i + 1),
      color: colors[enemyId],
      isHuman: false,
    });
  }

  return result;
}

export function initGame(playerCount, enemyCount, rows, cols) {
  const total = playerCount + enemyCount;

  if (total === 0) {
    alert("The sum of the number of players and bots must be at least 2!");
    return;
  }

  const baseColors = [
    "#007BFF",
    "#C0392B",
    "#2ECCFF",
    "#F1C40F",
    "#B10DC9",
    "#FF851B",
    "#2ECC40",
    "#F012BE",
  ];

  shuffle(baseColors);
  let newPlayers = createPlayers(playerCount, enemyCount, baseColors);
  shuffle(newPlayers);

  for (let i = 0; i < newPlayers.length; i++) {
    newPlayers[i].id = i;
  }

  setPlayers(newPlayers);

  store.rows = rows;
  store.cols = cols;
  generateMap(rows, cols);

  assignOwners();
  initUI();
  createTerritoryElements();
  updateSidebar();
  updateReinforcementInfo();
  updateAttackResultsUI();
  initEventHandlers();

  store.currentTurn = 0;
  startFirstTurn();
}

function startFirstTurn() {
  updateSidebar();
  updateReinforcementInfo();
  updateAttackResultsUI();

  const current = players[store.currentTurn];

  if (!current.isHuman) {
    doAiTurn(current.id);
  }
}

export function resetGame() {
  store.currentTurn = 0;
  store.selectedTerritory = null;
  store.moveCount = 0;
  store.fastForwardEnabled = false;

  if (store.currentDelayTimeout) clearTimeout(store.currentDelayTimeout);

  store.currentDelayResolve = null;
  store.currentDelayTimeout = null;
  store.lockedTerritories.clear();
  store.skipAlert = false;

  clearLastAttackResults();
  territories.length = 0;

  const boardEl = document.getElementById("game-board");
  const newBoardEl = boardEl.cloneNode(false);

  boardEl.parentNode.replaceChild(newBoardEl, boardEl);
  document.getElementById("introMenu").style.display = "flex";
  document.getElementById("app-container").style.display = "none";
}
