const introMenu = document.getElementById("introMenu");
const appContainer = document.getElementById("app-container");
const startGameBtn = document.getElementById("startGameBtn");

const playerCountRange = document.getElementById("playerCountRange");
const enemyCountRange = document.getElementById("enemyCountRange");
const mapSizeRange = document.getElementById("mapSizeRange");

const playerCountValue = document.getElementById("playerCountValue");
const enemyCountValue = document.getElementById("enemyCountValue");
const mapSizeValue = document.getElementById("mapSizeValue");

const mapSizeLabels = [
  "Small (6x9)",
  "Medium (8x12)",
  "Large (10x15)",
  "Very large (12x18)",
];

playerCountRange.addEventListener("input", (e) => {
  let p = parseInt(e.target.value, 10);
  let en = parseInt(enemyCountRange.value, 10);

  let sum = p + en;
  if (sum < 2) {
    en = 2 - p;
  } else if (sum > 8) {
    en = 8 - p;
  }
  enemyCountRange.value = en;
  enemyCountValue.textContent = en;

  playerCountValue.textContent = p;
});

enemyCountRange.addEventListener("input", (e) => {
  let en = parseInt(e.target.value, 10);
  let p = parseInt(playerCountRange.value, 10);

  let sum = p + en;
  if (sum < 2) {
    p = 2 - en;
  } else if (sum > 8) {
    p = 8 - en;
  }
  playerCountRange.value = p;
  playerCountValue.textContent = p;

  enemyCountValue.textContent = en;
});

mapSizeRange.addEventListener("input", (e) => {
  const val = parseInt(e.target.value, 10);
  mapSizeValue.textContent = mapSizeLabels[val] || "Medium (8x12)";
});

startGameBtn.addEventListener("click", () => {
  const p = parseInt(playerCountRange.value, 10);
  const e = parseInt(enemyCountRange.value, 10);
  const val = parseInt(mapSizeRange.value, 10);

  let rows, cols;
  switch (val) {
    case 0:
      rows = 6;
      cols = 9;
      break;
    case 1:
      rows = 8;
      cols = 12;
      break;
    case 2:
      rows = 10;
      cols = 15;
      break;
    default:
      rows = 12;
      cols = 18;
  }

  import("./main.js").then((module) => {
    module.initGame(p, e, rows, cols);
  });

  introMenu.style.display = "none";
  appContainer.style.display = "flex";
});
