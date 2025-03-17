import { players, lastAttackResults } from "./gameLogic.js";
import { territories } from "./map.js";
import { store } from "./store.js";
import { getLargestConnectedComponentSize } from "./gameLogic.js";
import { checkGameOver } from "./turnFlow.js";

let turnIndicatorEl, statsEl, reinforcementInfoEl, attackResultsEl;
let actionBtn, fastForwardBtn, withdrawBtn;
let howToPlayBtn, popupOverlay, popupCloseBtn;
let boardEl, moveCounterEl;

export function initUI() {
  turnIndicatorEl = document.getElementById("turnIndicator");
  statsEl = document.getElementById("stats");
  reinforcementInfoEl = document.getElementById("reinforcementInfo");
  attackResultsEl = document.getElementById("attackResults");
  actionBtn = document.getElementById("endTurnBtn");
  fastForwardBtn = document.getElementById("fastForwardBtn");
  withdrawBtn = document.getElementById("withdrawBtn");
  howToPlayBtn = document.getElementById("howToPlayBtn");
  popupOverlay = document.getElementById("popupOverlay");
  popupCloseBtn = document.getElementById("popupCloseBtn");
  boardEl = document.getElementById("game-board");
  moveCounterEl = document.getElementById("moveCounter");
  updateMoveCounter();
}

export function createTerritoryElements() {
  boardEl.innerHTML = "";

  const rows = store.rows;
  const cols = store.cols;
  const cellW = 900 / cols;
  const cellH = 600 / rows;
  const fontSizeBase = Math.round(Math.min(cellW, cellH) * 0.4);

  territories.forEach((t) => {
    const el = document.createElement("div");

    el.classList.add("territory");
    el.setAttribute("data-territory-id", t.id);

    const left = t.col * cellW;
    const top = t.row * cellH;
    const width = cellW;
    const height = cellH;

    el.style.left = left + "px";
    el.style.top = top + "px";
    el.style.width = width + "px";
    el.style.height = height + "px";
    el.style.backgroundColor = players[t.owner].color;
    el.textContent = t.dice;
    el.style.fontSize = fontSizeBase + "px";

    boardEl.appendChild(el);
  });
}

export function getTerritoryElement(tid) {
  return boardEl.querySelector(`[data-territory-id='${tid}']`);
}

export function updateTerritoryUI(t) {
  const el = getTerritoryElement(t.id);
  if (!el) return;

  el.textContent = t.dice;
  el.style.backgroundColor = players[t.owner].color;
  el.classList.remove("selected", "attacker", "defender");
}

export function updateMoveCounter() {
  if (moveCounterEl) {
    moveCounterEl.innerHTML = `<em>Number of moves made: ${store.moveCount}</em>`;
  }
}

export function updateSidebar() {
  let html = "";

  players.forEach((p) => {
    const terrCount = territories.filter((tt) => tt.owner === p.id).length;
    const diceSum = territories
      .filter((tt) => tt.owner === p.id)
      .reduce((sum, x) => sum + x.dice, 0);

    const activeClass = p.id === store.currentTurn ? "active" : "";

    html += `<p class="${activeClass}" style="color:${p.color}">
          <strong>${p.name}</strong>: ${terrCount} cells, ${diceSum} dice
        </p>`;
  });

  statsEl.innerHTML = html;

  if (checkGameOverUI()) {
    actionBtn.style.display = "none";
    fastForwardBtn.style.display = "none";
    withdrawBtn.style.display = "none";
    return;
  }

  const currentId = store.currentTurn;
  const cp = players[currentId];

  turnIndicatorEl.textContent = `${cp.name}'s turn`;

  if (cp.isHuman) {
    actionBtn.style.display = "block";
    withdrawBtn.style.display = "block";
    fastForwardBtn.style.display = "none";
  } else {
    actionBtn.style.display = "none";
    withdrawBtn.style.display = "none";
    fastForwardBtn.style.display = "block";

    fastForwardBtn.textContent = store.fastForwardEnabled
      ? "Turn off Fast Mode"
      : "Fast Mode";
  }
}

function checkGameOverUI() {
  return checkGameOver();
}

export function updateReinforcementInfo() {
  const cp = players[store.currentTurn];

  if (checkGameOverUI()) {
    reinforcementInfoEl.innerHTML = "";
    return;
  }

  const size = getLargestConnectedComponentSize(cp.id);

  if (size > 0) {
    reinforcementInfoEl.innerHTML = `<strong style="color:${cp.color}">${cp.name}</strong> will gain <strong style="color:yellow">+${size} dice</strong> at the end of this turn.`;
  } else {
    reinforcementInfoEl.innerHTML = "";
  }
}

export function updateAttackResultsUI() {
  if (!lastAttackResults) {
    attackResultsEl.innerHTML = "";
    return;
  }

  const {
    attackerId,
    attackerRolls,
    attackerSum,
    defenderId,
    defenderRolls,
    defenderSum,
  } = lastAttackResults;

  const attackerName = players[attackerId].name;
  const defenderName = players[defenderId].name;
  const attackerColor = players[attackerId].color;
  const defenderColor = players[defenderId].color;

  const attackerLine = `<span style="color:${attackerColor}">${attackerName}</span>'s dice:
    [${attackerRolls.join(", ")}] = ${attackerSum}`;
  const defenderLine = `<span style="color:${defenderColor}">${defenderName}</span>'s dice:
    [${defenderRolls.join(", ")}] = ${defenderSum}`;

  const resultLine =
    attackerSum > defenderSum
      ? `<span style="color:lime">Attacker won!</span>`
      : `<span style="color:red">Defender won!</span>`;

  attackResultsEl.innerHTML = `<strong>Last Attack</strong><br/>
    ${attackerLine}<br/>
    ${defenderLine}<br/>
    ${resultLine}`;
}

export function highlightAttack(a, d) {
  const aEl = getTerritoryElement(a.id);
  const dEl = getTerritoryElement(d.id);

  if (aEl) {
    aEl.classList.add("attacker");
    aEl.style.backgroundColor = "rgba(0,255,0,0.3)";
  }

  if (dEl) {
    dEl.classList.add("defender");
    dEl.style.backgroundColor = "rgba(255,0,0,0.3)";
  }
}

export function removeHighlight(a, d) {
  const aEl = getTerritoryElement(a.id);
  const dEl = getTerritoryElement(d.id);

  if (aEl) {
    aEl.classList.remove("attacker");
    aEl.style.backgroundColor = players[a.owner].color;
  }

  if (dEl) {
    dEl.classList.remove("defender");
    dEl.style.backgroundColor = players[d.owner].color;
  }
}
