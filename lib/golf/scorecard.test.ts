import { describe, expect, it } from 'vitest';
import {
  EIGHTEEN_HOLES_COMPLETE,
  EIGHTEEN_HOLES_MIXED,
  NINE_HOLES_FROM_TEN,
  SETUP_EMPTY,
} from './fixtures';
import {
  type GolfHole,
  type MissCounts,
  formatScorecardText,
  formatToPar,
  groupHolesByNine,
  holeScoreToPar,
  mostCommonMiss,
  nextUnrecordedHoleNumber,
  parseScorecard,
  percentage,
  scoreMarkKind,
  sumHoles,
} from './scorecard';

describe('parseScorecard', () => {
  it('round-trips valid fixture JSON', () => {
    const json = JSON.stringify(EIGHTEEN_HOLES_MIXED);
    expect(parseScorecard(json)).toEqual(EIGHTEEN_HOLES_MIXED);
  });

  it('returns null for the literal "null"', () => {
    expect(parseScorecard('null')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseScorecard('{not json')).toBeNull();
  });

  it('returns null for version !== 1', () => {
    const bad = { ...EIGHTEEN_HOLES_MIXED, version: 2 };
    expect(parseScorecard(JSON.stringify(bad))).toBeNull();
  });

  it('returns null when holes is missing', () => {
    const rest = Object.fromEntries(
      Object.entries(EIGHTEEN_HOLES_MIXED).filter(([key]) => key !== 'holes')
    );
    expect(parseScorecard(JSON.stringify(rest))).toBeNull();
  });

  it('returns null when a hole is missing a numeric number', () => {
    const bad = {
      ...EIGHTEEN_HOLES_MIXED,
      holes: [{ ...EIGHTEEN_HOLES_MIXED.holes[0], number: 'one' }],
    };
    expect(parseScorecard(JSON.stringify(bad))).toBeNull();
  });

  it('returns null for a bad status', () => {
    const bad = { ...EIGHTEEN_HOLES_MIXED, status: 'nope' };
    expect(parseScorecard(JSON.stringify(bad))).toBeNull();
  });
});

describe('formatToPar', () => {
  it('formats even par as E', () => {
    expect(formatToPar(0)).toBe('E');
  });

  it('formats over par with a plus sign', () => {
    expect(formatToPar(3)).toBe('+3');
  });

  it('formats under par with a minus sign', () => {
    expect(formatToPar(-1)).toBe('-1');
  });
});

describe('scoreMarkKind', () => {
  it.each([
    [-3, 'eagle'],
    [-2, 'eagle'],
    [-1, 'birdie'],
    [0, 'par'],
    [1, 'bogey'],
    [2, 'double'],
    [3, 'double'],
    [null, null],
  ] as const)('maps %s to %s', (input, expected) => {
    expect(scoreMarkKind(input)).toBe(expected);
  });
});

describe('holeScoreToPar', () => {
  const base: GolfHole = {
    number: 1,
    par: 4,
    yardage: null,
    handicap: null,
    strokes: null,
    putts: null,
    fairway: null,
    green: null,
    score_to_par: null,
  };

  it('prefers score_to_par when present', () => {
    expect(holeScoreToPar({ ...base, score_to_par: -1, strokes: 3 })).toBe(-1);
  });

  it('falls back to strokes - par when score_to_par is null', () => {
    expect(holeScoreToPar({ ...base, score_to_par: null, strokes: 5, par: 4 })).toBe(1);
  });

  it('returns null when neither score_to_par nor strokes/par are known', () => {
    expect(holeScoreToPar({ ...base, score_to_par: null, strokes: null })).toBeNull();
    expect(holeScoreToPar({ ...base, score_to_par: null, strokes: 4, par: null })).toBeNull();
  });
});

describe('groupHolesByNine', () => {
  it('groups 10..18 into a single In group', () => {
    const groups = groupHolesByNine(NINE_HOLES_FROM_TEN.holes);
    expect(groups).toHaveLength(1);
    expect(groups[0].nine).toBe('back');
    expect(groups[0].label).toBe('In');
    expect(groups[0].holes.map((h) => h.number)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });

  it('preserves play order: 10..18 then 1..9 gives [In, Out]', () => {
    const holes = [...NINE_HOLES_FROM_TEN.holes, ...EIGHTEEN_HOLES_MIXED.holes.slice(0, 9)];
    const groups = groupHolesByNine(holes);
    expect(groups.map((g) => g.label)).toEqual(['In', 'Out']);
  });

  it('groups 1..18 into [Out, In]', () => {
    const groups = groupHolesByNine(EIGHTEEN_HOLES_MIXED.holes);
    expect(groups.map((g) => g.label)).toEqual(['Out', 'In']);
    expect(groups[0].holes).toHaveLength(9);
    expect(groups[1].holes).toHaveLength(9);
  });

  it('returns an empty array for no holes', () => {
    expect(groupHolesByNine([])).toEqual([]);
  });
});

describe('nextUnrecordedHoleNumber', () => {
  it('returns the first unrecorded hole in play order', () => {
    expect(nextUnrecordedHoleNumber(NINE_HOLES_FROM_TEN.holes)).toBe(15);
  });

  it('returns null when all holes are recorded', () => {
    expect(nextUnrecordedHoleNumber(EIGHTEEN_HOLES_COMPLETE.holes)).toBeNull();
  });
});

describe('mostCommonMiss', () => {
  it('returns null when all counts are zero', () => {
    const misses: MissCounts = { left: 0, right: 0, short: 0, long: 0 };
    expect(mostCommonMiss(misses)).toBeNull();
  });

  it('returns the clear winner', () => {
    const misses: MissCounts = { left: 1, right: 3, short: 0, long: 1 };
    expect(mostCommonMiss(misses)).toBe('right');
  });

  it('resolves ties to the earlier entry in DIRECTIONS order', () => {
    const misses: MissCounts = { left: 2, right: 2, short: 0, long: 0 };
    expect(mostCommonMiss(misses)).toBe('left');
  });
});

describe('percentage', () => {
  it('returns null when possible is 0', () => {
    expect(percentage(0, 0)).toBeNull();
  });

  it('computes a simple percentage', () => {
    expect(percentage(7, 14)).toBe(50);
  });

  it('rounds to the nearest integer', () => {
    expect(percentage(1, 3)).toBe(33);
    expect(percentage(2, 3)).toBe(67);
  });
});

describe('sumHoles', () => {
  it('sums non-null values', () => {
    expect(sumHoles(EIGHTEEN_HOLES_MIXED.holes, 'par')).toBe(72);
  });

  it('returns null when every value is null', () => {
    expect(sumHoles(SETUP_EMPTY.holes, 'par')).toBeNull();
  });
});

describe('formatScorecardText', () => {
  it('includes course name, holes played, status, both nines, and the total for a complete round', () => {
    const text = formatScorecardText(EIGHTEEN_HOLES_COMPLETE);
    expect(text).toContain('Presidio Golf Course');
    expect(text).toContain('18 holes');
    expect(text).toContain('Complete');
    expect(text).toContain('Out');
    expect(text).toContain('In');
    expect(text).toContain('Total: 81');
  });

  it('puts the In block first and omits the Out block for a back-nine-only round', () => {
    const text = formatScorecardText(NINE_HOLES_FROM_TEN);
    const inIndex = text.indexOf('In');
    expect(inIndex).toBeGreaterThan(-1);
    expect(text).not.toContain('Out');
    // "In" should appear before any hole-number content, i.e. it's the first block.
    const firstHoleLineIndex = text.indexOf('Hole');
    expect(inIndex).toBeLessThan(firstHoleLineIndex === -1 ? Infinity : firstHoleLineIndex + 100);
  });
});
