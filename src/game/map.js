export let territories = [];

export function generateMap(rows, cols) {
  const tempGrid = [];
  for (let r = 0; r < rows; r++) {
    tempGrid[r] = [];
    for (let c = 0; c < cols; c++) {
      tempGrid[r][c] = { removed: false };
    }
  }

  const centerR = Math.floor(rows / 2);
  const centerC = Math.floor(cols / 2);

  const maxLayer = Math.floor(Math.min(rows, cols) / 2);

  for (let layer = 0; layer <= maxLayer; layer++) {
    const removalProb = Math.max(0.4 - layer * 0.1, 0);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r === centerR && c === centerC) continue;

        let cellLayer = Math.min(r, c, rows - 1 - r, cols - 1 - c);
        if (cellLayer === layer && !tempGrid[r][c].removed) {
          if (Math.random() < removalProb) {
            tempGrid[r][c].removed = true;
            if (!checkConnectivity(tempGrid, centerR, centerC, rows, cols)) {
              tempGrid[r][c].removed = false;
            }
          }
        }
      }
    }
  }

  territories = [];
  let idCounter = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!tempGrid[r][c].removed) {
        territories.push({
          id: idCounter++,
          row: r,
          col: c,
          owner: null,
          dice: Math.floor(Math.random() * 3) + 2,
          neighbors: [],
        });
      }
    }
  }

  territories.forEach((t) => {
    const { row, col } = t;
    if (row > 0 && !tempGrid[row - 1][col].removed) {
      const up = findTerritory(row - 1, col);
      if (up) t.neighbors.push(up.id);
    }
    if (row < rows - 1 && !tempGrid[row + 1][col].removed) {
      const down = findTerritory(row + 1, col);
      if (down) t.neighbors.push(down.id);
    }
    if (col > 0 && !tempGrid[row][col - 1].removed) {
      const left = findTerritory(row, col - 1);
      if (left) t.neighbors.push(left.id);
    }
    if (col < cols - 1 && !tempGrid[row][col + 1].removed) {
      const right = findTerritory(row, col + 1);
      if (right) t.neighbors.push(right.id);
    }
  });

  function findTerritory(r, c) {
    return territories.find((x) => x.row === r && x.col === c);
  }
}

function checkConnectivity(grid, centerR, centerC, rows, cols) {
  const queue = [{ r: centerR, c: centerC }];
  const visited = new Set([`${centerR},${centerC}`]);

  while (queue.length > 0) {
    const { r, c } = queue.shift();
    for (let [nr, nc] of getNeighbors(r, c, grid, rows, cols)) {
      const key = `${nr},${nc}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ r: nr, c: nc });
      }
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!grid[r][c].removed) {
        const key = `${r},${c}`;
        if (!visited.has(key)) {
          return false;
        }
      }
    }
  }
  return true;
}

function getNeighbors(r, c, grid, rows, cols) {
  const arr = [];
  if (r > 0 && !grid[r - 1][c].removed) arr.push([r - 1, c]);
  if (r < rows - 1 && !grid[r + 1][c].removed) arr.push([r + 1, c]);
  if (c > 0 && !grid[r][c - 1].removed) arr.push([r, c - 1]);
  if (c < cols - 1 && !grid[r][c + 1].removed) arr.push([r, c + 1]);
  return arr;
}
