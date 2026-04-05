export type TCell = 'empty' | 'wall' | 'start' | 'goal';

export type TDirection = 'up' | 'down' | 'left' | 'right';

export type TGameStatus = 'playing' | 'won' | 'lost';

export type TPosition = {
  row: number;
  col: number;
};

export type TGameSnapshot = {
  position: TPosition;
  movesUsed: number;
  status: TGameStatus;
  trail: boolean[][];
};

export type TLevel = {
  grid: TCell[][];
  start: TPosition;
  goal: TPosition;
  moveLimit: number;
};

export type TRng = {
  nextFloat: () => number;
};

export const DEFAULT_MOVE_LIMIT = 10;

export function parseLevel(raw: string[]): {
  grid: TCell[][];
  start: TPosition;
  goal: TPosition;
} {
  const grid: TCell[][] = [];
  let start: TPosition | null = null;
  let goal: TPosition | null = null;

  for (let r = 0; r < raw.length; r += 1) {
    const rowStr = raw[r] ?? '';
    const row: TCell[] = [];

    for (let c = 0; c < rowStr.length; c += 1) {
      const ch = rowStr[c];
      if (ch === '#') {
        row.push('wall');
      } else if (ch === 'S') {
        row.push('start');
        start = { row: r, col: c };
      } else if (ch === 'G') {
        row.push('goal');
        goal = { row: r, col: c };
      } else {
        row.push('empty');
      }
    }

    grid.push(row);
  }

  if (!start || !goal) {
    throw new Error('Invalid level: missing start or goal');
  }

  return { grid, start, goal };
}

export function createTrail(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
}

export function cloneTrail(trail: boolean[][]): boolean[][] {
  return trail.map((row) => row.slice());
}

export function createSeededRng(seed: number): TRng {
  let state = seed >>> 0;
  return {
    nextFloat: () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    },
  };
}

export function randomIntWithRng(rng: TRng, minInclusive: number, maxInclusive: number): number {
  const min = Math.ceil(minInclusive);
  const max = Math.floor(maxInclusive);
  return Math.floor(rng.nextFloat() * (max - min + 1)) + min;
}

export function directionVector(direction: TDirection): { dr: number; dc: number } {
  switch (direction) {
    case 'up':
      return { dr: -1, dc: 0 };
    case 'down':
      return { dr: 1, dc: 0 };
    case 'left':
      return { dr: 0, dc: -1 };
    case 'right':
      return { dr: 0, dc: 1 };
  }
}

export function positionsEqual(a: TPosition, b: TPosition): boolean {
  return a.row === b.row && a.col === b.col;
}

export function inBounds(grid: TCell[][], pos: TPosition): boolean {
  return pos.row >= 0 && pos.row < grid.length && pos.col >= 0 && pos.col < (grid[0]?.length ?? 0);
}

export function isBlocked(grid: TCell[][], pos: TPosition): boolean {
  if (!inBounds(grid, pos)) return true;
  return grid[pos.row]?.[pos.col] === 'wall';
}

export function slide(grid: TCell[][], from: TPosition, direction: TDirection): TPosition {
  const { dr, dc } = directionVector(direction);
  let cur: TPosition = from;
  let next: TPosition = { row: cur.row + dr, col: cur.col + dc };
  if (isBlocked(grid, next)) return from;

  while (!isBlocked(grid, next)) {
    cur = next;
    next = { row: cur.row + dr, col: cur.col + dc };
  }

  return cur;
}

export function isStoppableCell(grid: TCell[][], pos: TPosition): boolean {
  if (!inBounds(grid, pos)) return false;
  if (grid[pos.row]?.[pos.col] === 'wall') return false;
  const candidates: TPosition[] = [
    { row: pos.row - 1, col: pos.col },
    { row: pos.row + 1, col: pos.col },
    { row: pos.row, col: pos.col - 1 },
    { row: pos.row, col: pos.col + 1 },
  ];
  return candidates.some((p) => isBlocked(grid, p));
}

function pickRandomEmptyCell(grid: TCell[][], rng: TRng): TPosition {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  for (let attempts = 0; attempts < 5000; attempts += 1) {
    const row = randomIntWithRng(rng, 1, rows - 2);
    const col = randomIntWithRng(rng, 1, cols - 2);
    if (grid[row]?.[col] !== 'wall') return { row, col };
  }
  return { row: 1, col: 1 };
}

function pickRandomStoppableCell(grid: TCell[][], rng: TRng): TPosition {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  for (let attempts = 0; attempts < 8000; attempts += 1) {
    const row = randomIntWithRng(rng, 1, rows - 2);
    const col = randomIntWithRng(rng, 1, cols - 2);
    const pos = { row, col };
    if (grid[row]?.[col] === 'wall') continue;
    if (!isStoppableCell(grid, pos)) continue;
    return pos;
  }
  return pickRandomEmptyCell(grid, rng);
}

export function minMovesToGoal(
  grid: TCell[][],
  start: TPosition,
  goal: TPosition,
  moveLimit: number,
): number | null {
  const encode = (p: TPosition) => `${p.row},${p.col}`;

  const visited = new Set<string>();
  const queue: Array<{ pos: TPosition; dist: number }> = [{ pos: start, dist: 0 }];
  visited.add(encode(start));

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    if (positionsEqual(item.pos, goal)) return item.dist;
    if (item.dist >= moveLimit) continue;

    const nextPositions: TPosition[] = [
      slide(grid, item.pos, 'up'),
      slide(grid, item.pos, 'down'),
      slide(grid, item.pos, 'left'),
      slide(grid, item.pos, 'right'),
    ];

    for (const np of nextPositions) {
      const key = encode(np);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ pos: np, dist: item.dist + 1 });
    }
  }

  return null;
}

export function generateLevel(levelNumber: number, seed: number): TLevel {
  const size = Math.min(12, Math.max(8, 8 + Math.floor((levelNumber - 2) / 2)));
  const moveLimit = Math.max(6, DEFAULT_MOVE_LIMIT - Math.floor((levelNumber - 1) / 4));
  const wallProbability = Math.min(0.26, 0.12 + (levelNumber - 1) * 0.01);

  const rng = createSeededRng(seed ^ (levelNumber * 2654435761));

  for (let attempts = 0; attempts < 200; attempts += 1) {
    const grid: TCell[][] = Array.from({ length: size }, (_r, r) =>
      Array.from({ length: size }, (_c, c) => {
        if (r === 0 || c === 0 || r === size - 1 || c === size - 1) return 'wall';
        return rng.nextFloat() < wallProbability ? 'wall' : 'empty';
      }),
    );

    const start = pickRandomEmptyCell(grid, rng);
    const goal = pickRandomStoppableCell(grid, rng);
    if (positionsEqual(start, goal)) continue;

    grid[start.row][start.col] = 'start';
    grid[goal.row][goal.col] = 'goal';

    const minMoves = minMovesToGoal(grid, start, goal, moveLimit);
    if (minMoves === null) continue;
    if (minMoves < 2) continue;

    return { grid, start, goal, moveLimit };
  }

  const fallback = parseLevel([
    '########',
    '#S.....#',
    '#.###..#',
    '#...#..#',
    '#.###..#',
    '#......#',
    '#.....G#',
    '########',
  ]);
  return { ...fallback, moveLimit: DEFAULT_MOVE_LIMIT };
}
