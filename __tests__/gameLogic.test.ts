import {
  cloneTrail,
  createSeededRng,
  createTrail,
  DEFAULT_MOVE_LIMIT,
  directionVector,
  generateLevel,
  getShortestPathCorridor,
  inBounds,
  isBlocked,
  isLevelWin,
  isStoppableCell,
  isTrailCoverageComplete,
  minMovesToGoal,
  parseLevel,
  positionsEqual,
  slide,
} from '../gameLogic';

// ─── Simple 6×6 test grid ─────────────────────────────────────────────────────
//   ######
//   #S...#
//   #.##.#
//   #....#
//   #...G#
//   ######
const RAW = ['######', '#S...#', '#.##.#', '#....#', '#...G#', '######'];

describe('parseLevel', () => {
  it('builds the correct grid size', () => {
    const { grid } = parseLevel(RAW);
    expect(grid).toHaveLength(6);
    expect(grid[0]).toHaveLength(6);
  });

  it('identifies start position', () => {
    const { start } = parseLevel(RAW);
    expect(start).toEqual({ row: 1, col: 1 });
  });

  it('identifies goal position', () => {
    const { goal } = parseLevel(RAW);
    expect(goal).toEqual({ row: 4, col: 4 });
  });

  it('marks wall cells', () => {
    const { grid } = parseLevel(RAW);
    expect(grid[0][0]).toBe('wall');
    expect(grid[2][2]).toBe('wall');
  });

  it('marks empty cells', () => {
    const { grid } = parseLevel(RAW);
    expect(grid[1][2]).toBe('empty');
  });

  it('throws when start is missing', () => {
    expect(() => parseLevel(['###', '#.G#', '###'])).toThrow('Invalid level: missing start or goal');
  });

  it('throws when goal is missing', () => {
    expect(() => parseLevel(['###', '#S.#', '###'])).toThrow('Invalid level: missing start or goal');
  });
});

describe('positionsEqual', () => {
  it('returns true for identical positions', () => {
    expect(positionsEqual({ row: 2, col: 3 }, { row: 2, col: 3 })).toBe(true);
  });

  it('returns false when row differs', () => {
    expect(positionsEqual({ row: 1, col: 3 }, { row: 2, col: 3 })).toBe(false);
  });

  it('returns false when col differs', () => {
    expect(positionsEqual({ row: 2, col: 2 }, { row: 2, col: 3 })).toBe(false);
  });
});

describe('inBounds', () => {
  const { grid } = parseLevel(RAW);

  it('returns true for an interior cell', () => {
    expect(inBounds(grid, { row: 2, col: 2 })).toBe(true);
  });

  it('returns false for a negative row', () => {
    expect(inBounds(grid, { row: -1, col: 0 })).toBe(false);
  });

  it('returns false past the last row', () => {
    expect(inBounds(grid, { row: 6, col: 0 })).toBe(false);
  });

  it('returns false past the last col', () => {
    expect(inBounds(grid, { row: 0, col: 6 })).toBe(false);
  });
});

describe('isBlocked', () => {
  const { grid } = parseLevel(RAW);

  it('returns true for a wall cell', () => {
    expect(isBlocked(grid, { row: 0, col: 0 })).toBe(true);
  });

  it('returns false for an empty cell', () => {
    expect(isBlocked(grid, { row: 1, col: 2 })).toBe(false);
  });

  it('returns true out of bounds', () => {
    expect(isBlocked(grid, { row: -1, col: 0 })).toBe(true);
  });
});

describe('directionVector', () => {
  it('up → { dr: -1, dc: 0 }', () => expect(directionVector('up')).toEqual({ dr: -1, dc: 0 }));
  it('down → { dr: 1, dc: 0 }', () => expect(directionVector('down')).toEqual({ dr: 1, dc: 0 }));
  it('left → { dr: 0, dc: -1 }', () => expect(directionVector('left')).toEqual({ dr: 0, dc: -1 }));
  it('right → { dr: 0, dc: 1 }', () => expect(directionVector('right')).toEqual({ dr: 0, dc: 1 }));
});

describe('slide', () => {
  const { grid } = parseLevel(RAW);

  it('slides right until wall', () => {
    // From (1,1) going right hits the wall at col 5, so stops at col 4
    const result = slide(grid, { row: 1, col: 1 }, 'right');
    expect(result).toEqual({ row: 1, col: 4 });
  });

  it('slides down until wall', () => {
    // From (1,1) going down: row 2 col 1 is empty, row 3 col 1 is empty, row 4 col 1 is empty,
    // row 5 is the border wall, so stops at (4,1)
    const result = slide(grid, { row: 1, col: 1 }, 'down');
    expect(result).toEqual({ row: 4, col: 1 });
  });

  it('stays in place when immediately blocked', () => {
    // (1,1) going left — col 0 is a wall border
    const result = slide(grid, { row: 1, col: 1 }, 'left');
    expect(result).toEqual({ row: 1, col: 1 });
  });

  it('slides up until wall', () => {
    // From (4,4) going up: (3,4) empty, (2,4) empty, (1,4) empty, (0,4) wall → stops at (1,4)
    const result = slide(grid, { row: 4, col: 4 }, 'up');
    expect(result).toEqual({ row: 1, col: 4 });
  });

  it('stops on ice when iceStops is true', () => {
    const iceGrid: typeof grid = grid.map((row) => row.slice());
    iceGrid[1][3] = 'ice';

    const withoutIceStops = slide(iceGrid, { row: 1, col: 1 }, 'right');
    expect(withoutIceStops).toEqual({ row: 1, col: 4 });

    const withIceStops = slide(iceGrid, { row: 1, col: 1 }, 'right', { iceStops: true });
    expect(withIceStops).toEqual({ row: 1, col: 3 });
  });

  it('can slide off an ice cell when iceStops is true', () => {
    const iceGrid: typeof grid = grid.map((row) => row.slice());
    iceGrid[1][1] = 'ice';

    const result = slide(iceGrid, { row: 1, col: 1 }, 'right', { iceStops: true });
    expect(result).toEqual({ row: 1, col: 4 });
  });
});

describe('isStoppableCell', () => {
  const { grid } = parseLevel(RAW);

  it('returns true for a cell adjacent to a wall', () => {
    // (1,1) is next to the border walls
    expect(isStoppableCell(grid, { row: 1, col: 1 })).toBe(true);
  });

  it('returns false for a wall cell itself', () => {
    expect(isStoppableCell(grid, { row: 0, col: 0 })).toBe(false);
  });

  it('returns false out of bounds', () => {
    expect(isStoppableCell(grid, { row: -1, col: 0 })).toBe(false);
  });
});

describe('createTrail', () => {
  it('creates a grid of the correct size filled with false', () => {
    const trail = createTrail(3, 4);
    expect(trail).toHaveLength(3);
    expect(trail[0]).toHaveLength(4);
    expect(trail.flat().every((v) => v === false)).toBe(true);
  });
});

describe('cloneTrail', () => {
  it('produces a deep copy', () => {
    const original = [[true, false], [false, true]];
    const copy = cloneTrail(original);
    copy[0][0] = false;
    expect(original[0][0]).toBe(true);
  });
});

describe('minMovesToGoal', () => {
  const { grid, start, goal } = parseLevel(RAW);

  it('finds a path within the move limit', () => {
    const result = minMovesToGoal(grid, start, goal, DEFAULT_MOVE_LIMIT);
    expect(result).not.toBeNull();
    expect(result!).toBeGreaterThanOrEqual(2);
    expect(result!).toBeLessThanOrEqual(DEFAULT_MOVE_LIMIT);
  });

  it('returns null when move limit is too tight', () => {
    const result = minMovesToGoal(grid, start, goal, 1);
    expect(result).toBeNull();
  });

  it('returns 0 when already at goal', () => {
    const result = minMovesToGoal(grid, goal, goal, DEFAULT_MOVE_LIMIT);
    expect(result).toBe(0);
  });
});

describe('createSeededRng', () => {
  it('produces deterministic output', () => {
    const rng1 = createSeededRng(42);
    const rng2 = createSeededRng(42);
    expect(rng1.nextFloat()).toBe(rng2.nextFloat());
    expect(rng1.nextFloat()).toBe(rng2.nextFloat());
  });

  it('produces values in [0, 1)', () => {
    const rng = createSeededRng(12345);
    for (let i = 0; i < 100; i++) {
      const v = rng.nextFloat();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('generateLevel', () => {
  it('returns a level with grid, start, goal and moveLimit', () => {
    const level = generateLevel(1, 99999);
    expect(level.grid).toBeDefined();
    expect(level.start).toBeDefined();
    expect(level.goal).toBeDefined();
    expect(level.moveLimit).toBeGreaterThan(0);
  });

  it('generates a solvable level (minMovesToGoal is not null)', () => {
    const level = generateLevel(1, 99999);
    const result = minMovesToGoal(level.grid, level.start, level.goal, level.moveLimit);
    expect(result).not.toBeNull();
  });

  it('move limit stays at 10 for all levels', () => {
    expect(generateLevel(1, 42).moveLimit).toBe(DEFAULT_MOVE_LIMIT);
    expect(generateLevel(5, 42).moveLimit).toBe(DEFAULT_MOVE_LIMIT);
    expect(generateLevel(20, 42).moveLimit).toBe(DEFAULT_MOVE_LIMIT);
  });

  it('grid grows for higher levels', () => {
    const early = generateLevel(1, 42);
    const late = generateLevel(10, 42);
    expect(late.grid.length).toBeGreaterThanOrEqual(early.grid.length);
  });

  it('is deterministic for the same seed and level', () => {
    const a = generateLevel(5, 777);
    const b = generateLevel(5, 777);
    expect(a.start).toEqual(b.start);
    expect(a.goal).toEqual(b.goal);
    expect(a.moveLimit).toBe(b.moveLimit);
  });

  it('generates solvable levels with ice stops enabled', () => {
    for (let level = 1; level <= 10; level += 1) {
      const generated = generateLevel(level, 1000 + level, { iceStops: true });
      const result = minMovesToGoal(
        generated.grid,
        generated.start,
        generated.goal,
        generated.moveLimit,
        { iceStops: true },
      );
      expect(result).not.toBeNull();
    }
  });

  it('places ice only on shortest-path corridor when ice stops enabled', () => {
    const encode = (row: number, col: number) => `${row},${col}`;
    const gridWithoutIce = (grid: ReturnType<typeof generateLevel>['grid']) =>
      grid.map((row) => row.map((cell) => (cell === 'ice' ? 'empty' : cell)));
    let foundIce = false;

    for (let seed = 0; seed < 100; seed += 1) {
      const level = generateLevel(15, 9000 + seed, { iceStops: true });
      const icePositions: Array<{ row: number; col: number }> = [];
      level.grid.forEach((row, r) => {
        row.forEach((cell, c) => {
          if (cell === 'ice') icePositions.push({ row: r, col: c });
        });
      });
      if (icePositions.length === 0) continue;

      foundIce = true;
      const corridor = getShortestPathCorridor(
        gridWithoutIce(level.grid),
        level.start,
        level.goal,
        { iceStops: true },
      );
      for (const pos of icePositions) {
        expect(corridor.has(encode(pos.row, pos.col))).toBe(true);
      }
    }

    expect(foundIce).toBe(true);
  });

  it('returns empty requiredCells when path forcing is disabled', () => {
    const level = generateLevel(5, 42);
    expect(level.requiredCells).toEqual([]);
  });

  it('generates requiredCells on shortest-path corridor when path forcing enabled', () => {
    let foundRequired = false;

    for (let seed = 0; seed < 100; seed += 1) {
      const level = generateLevel(10, 7000 + seed, { requireTrailCoverage: true });
      if (level.requiredCells.length === 0) continue;

      foundRequired = true;
      const corridor = getShortestPathCorridor(level.grid, level.start, level.goal, { iceStops: false });
      const encode = (row: number, col: number) => `${row},${col}`;
      for (const pos of level.requiredCells) {
        expect(corridor.has(encode(pos.row, pos.col))).toBe(true);
      }

      const result = minMovesToGoal(level.grid, level.start, level.goal, level.moveLimit);
      expect(result).not.toBeNull();
    }

    expect(foundRequired).toBe(true);
  });

  it('generates solvable path-forcing levels with ice stops (R5)', () => {
    for (let level = 1; level <= 10; level += 1) {
      const generated = generateLevel(level, 2000 + level, {
        iceStops: true,
        requireTrailCoverage: true,
      });
      expect(generated.requiredCells.length).toBeGreaterThanOrEqual(4);
      const result = minMovesToGoal(
        generated.grid,
        generated.start,
        generated.goal,
        generated.moveLimit,
        { iceStops: true },
      );
      expect(result).not.toBeNull();
    }
  });
});

describe('isTrailCoverageComplete', () => {
  it('returns true when requiredCells is empty', () => {
    expect(isTrailCoverageComplete([[true]], [])).toBe(true);
  });

  it('returns false when a required cell is not painted', () => {
    const trail = [
      [true, false],
      [false, false],
    ];
    expect(isTrailCoverageComplete(trail, [{ row: 0, col: 0 }, { row: 0, col: 1 }])).toBe(false);
  });

  it('returns true when all required cells are painted', () => {
    const trail = [
      [true, true],
      [false, true],
    ];
    expect(isTrailCoverageComplete(trail, [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }])).toBe(true);
  });
});

describe('isLevelWin', () => {
  const goal = { row: 1, col: 2 };
  const requiredCells = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 2 },
  ];

  it('does not win at goal without full trail coverage', () => {
    const trail = [
      [true, true, false],
      [false, false, true],
    ];
    expect(isLevelWin(trail, goal, goal, requiredCells)).toBe(false);
  });

  it('wins at goal when all required cells are painted', () => {
    const trail = [
      [true, true, true],
      [false, false, true],
    ];
    expect(isLevelWin(trail, goal, goal, requiredCells)).toBe(true);
  });

  it('wins at goal when requiredCells is empty', () => {
    const trail = [[false, false, true]];
    expect(isLevelWin(trail, goal, goal, [])).toBe(true);
  });
});
