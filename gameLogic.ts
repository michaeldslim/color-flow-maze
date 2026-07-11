export type TCell = 'empty' | 'wall' | 'start' | 'goal' | 'ice';

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
  requiredCells: TPosition[];
};

export type TSlideOptions = {
  iceStops?: boolean;
};

export type TGenerateLevelOptions = {
  iceStops?: boolean;
  requireTrailCoverage?: boolean;
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

function isIceStopCell(grid: TCell[][], pos: TPosition, iceStops: boolean): boolean {
  return iceStops && grid[pos.row]?.[pos.col] === 'ice';
}

export function slide(
  grid: TCell[][],
  from: TPosition,
  direction: TDirection,
  options: TSlideOptions = {},
): TPosition {
  const iceStops = options.iceStops ?? false;
  const { dr, dc } = directionVector(direction);
  let cur: TPosition = from;
  let next: TPosition = { row: cur.row + dr, col: cur.col + dc };
  if (isBlocked(grid, next)) return from;

  while (!isBlocked(grid, next)) {
    cur = next;
    if (isIceStopCell(grid, cur, iceStops)) return cur;
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

function bfsDistances(
  grid: TCell[][],
  origin: TPosition,
  slideOptions: TSlideOptions,
): Map<string, number> {
  const encode = (p: TPosition) => `${p.row},${p.col}`;
  const distances = new Map<string, number>();
  const queue: Array<{ pos: TPosition; dist: number }> = [{ pos: origin, dist: 0 }];
  distances.set(encode(origin), 0);

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;

    const nextPositions: TPosition[] = [
      slide(grid, item.pos, 'up', slideOptions),
      slide(grid, item.pos, 'down', slideOptions),
      slide(grid, item.pos, 'left', slideOptions),
      slide(grid, item.pos, 'right', slideOptions),
    ];

    for (const np of nextPositions) {
      const key = encode(np);
      if (distances.has(key)) continue;
      distances.set(key, item.dist + 1);
      queue.push({ pos: np, dist: item.dist + 1 });
    }
  }

  return distances;
}

export function getShortestPathCorridor(
  grid: TCell[][],
  start: TPosition,
  goal: TPosition,
  slideOptions: TSlideOptions,
): Set<string> {
  const encode = (p: TPosition) => `${p.row},${p.col}`;
  const fromStart = bfsDistances(grid, start, slideOptions);
  const fromGoal = bfsDistances(grid, goal, slideOptions);
  const shortestDist = fromStart.get(encode(goal));
  if (shortestDist === undefined) return new Set();

  const corridor = new Set<string>();
  for (const [key, startDist] of fromStart.entries()) {
    const goalDist = fromGoal.get(key);
    if (goalDist !== undefined && startDist + goalDist === shortestDist) {
      corridor.add(key);
    }
  }

  return corridor;
}

function corridorToPositions(corridor: Set<string>): TPosition[] {
  return Array.from(corridor).map((key) => {
    const [row, col] = key.split(',').map(Number);
    return { row, col };
  });
}

export function getRequiredCells(
  grid: TCell[][],
  start: TPosition,
  goal: TPosition,
  slideOptions: TSlideOptions = {},
): TPosition[] {
  const corridor = getShortestPathCorridor(grid, start, goal, slideOptions);
  return corridorToPositions(corridor);
}

export function isTrailCoverageComplete(trail: boolean[][], requiredCells: TPosition[]): boolean {
  if (requiredCells.length === 0) return true;
  return requiredCells.every((pos) => trail[pos.row]?.[pos.col] === true);
}

export function isLevelWin(
  trail: boolean[][],
  position: TPosition,
  goal: TPosition,
  requiredCells: TPosition[],
): boolean {
  return positionsEqual(position, goal) && isTrailCoverageComplete(trail, requiredCells);
}

export function minMovesToGoal(
  grid: TCell[][],
  start: TPosition,
  goal: TPosition,
  moveLimit: number,
  options: TSlideOptions = {},
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
      slide(grid, item.pos, 'up', options),
      slide(grid, item.pos, 'down', options),
      slide(grid, item.pos, 'left', options),
      slide(grid, item.pos, 'right', options),
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

function placeIceOnGrid(
  grid: TCell[][],
  rng: TRng,
  iceProbability: number,
  corridor: Set<string> | null,
): void {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const encode = (p: TPosition) => `${p.row},${p.col}`;

  for (let r = 1; r < rows - 1; r += 1) {
    for (let c = 1; c < cols - 1; c += 1) {
      const cell = grid[r]?.[c];
      if (cell !== 'empty') continue;
      if (corridor && !corridor.has(encode({ row: r, col: c }))) continue;
      if (rng.nextFloat() < iceProbability) {
        grid[r][c] = 'ice';
      }
    }
  }
}

export function generateLevel(
  levelNumber: number,
  seed: number,
  options: TGenerateLevelOptions = {},
): TLevel {
  const iceStops = options.iceStops ?? false;
  const requireTrailCoverage = options.requireTrailCoverage ?? false;
  const slideOptions: TSlideOptions = { iceStops };
  const size = Math.min(12, Math.max(8, 8 + Math.floor((levelNumber - 2) / 2)));
  const moveLimit = DEFAULT_MOVE_LIMIT;
  const wallProbabilityBase =
    levelNumber <= 10
      ? 0.12 + (levelNumber - 1) * 0.009
      : levelNumber <= 20
        ? 0.201 + (levelNumber - 10) * 0.004
        : 0.241 + (levelNumber - 20) * 0.002;
  const wallProbability = Math.min(0.26, wallProbabilityBase);

  // Ice probability increases slowly with level to add variety
  const iceProbabilityBase = iceStops ? 0.04 + (levelNumber - 1) * 0.004 : 0.02 + (levelNumber - 1) * 0.003;
  const iceProbability = Math.min(iceStops ? 0.18 : 0.12, iceProbabilityBase);

  const rng = createSeededRng(seed ^ (levelNumber * 2654435761));

  for (let attempts = 0; attempts < 200; attempts += 1) {
    const grid: TCell[][] = Array.from({ length: size }, (_r, r) =>
      Array.from({ length: size }, (_c, c) => {
        if (r === 0 || c === 0 || r === size - 1 || c === size - 1) return 'wall';
        if (rng.nextFloat() < wallProbability) return 'wall';
        return 'empty';
      }),
    );

    const start = pickRandomEmptyCell(grid, rng);
    const goal = pickRandomStoppableCell(grid, rng);
    if (positionsEqual(start, goal)) continue;

    grid[start.row][start.col] = 'start';
    grid[goal.row][goal.col] = 'goal';

    const corridor = iceStops
      ? getShortestPathCorridor(grid, start, goal, slideOptions)
      : null;
    if (iceStops && corridor.size === 0) continue;

    placeIceOnGrid(grid, rng, iceProbability, corridor);

    const minMoves = minMovesToGoal(grid, start, goal, moveLimit, slideOptions);
    if (minMoves === null) continue;
    if (minMoves < 2) continue;

    const requiredCells = requireTrailCoverage ? getRequiredCells(grid, start, goal, slideOptions) : [];
    if (requireTrailCoverage && requiredCells.length < 4) continue;

    return { grid, start, goal, moveLimit, requiredCells };
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
  const fallbackRequired = requireTrailCoverage
    ? getRequiredCells(fallback.grid, fallback.start, fallback.goal, slideOptions)
    : [];
  return { ...fallback, moveLimit: DEFAULT_MOVE_LIMIT, requiredCells: fallbackRequired };
}
