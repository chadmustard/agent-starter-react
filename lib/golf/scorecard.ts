export type Direction = 'left' | 'right' | 'short' | 'long';
export type ShotResult = 'hit' | Direction;
export type RoundStatus = 'setup' | 'in_progress' | 'complete';

export interface GolfCourse {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

export interface GolfTee {
  name: string;
  gender: 'male' | 'female' | null;
  course_rating: number | null;
  slope: number | null;
  yardage: number | null;
}

export interface GolfHole {
  number: number;
  par: number | null;
  yardage: number | null;
  handicap: number | null;
  strokes: number | null;
  putts: number | null;
  fairway: ShotResult | null;
  green: ShotResult | null;
  score_to_par: number | null;
}

export interface NineSummary {
  strokes: number;
  par: number;
  putts: number;
}

export type MissCounts = Record<Direction, number>;

export interface GolfSummary {
  holes_completed: number;
  total_strokes: number;
  total_par: number;
  score_to_par: number;
  total_putts: number;
  fairways_hit: number;
  fairways_possible: number;
  greens_hit: number;
  greens_possible: number;
  fairway_misses: MissCounts;
  green_misses: MissCounts;
  front_nine: NineSummary | null;
  back_nine: NineSummary | null;
}

export interface GolfScorecard {
  version: 1;
  status: RoundStatus;
  course: GolfCourse | null;
  tee: GolfTee | null;
  holes_played: 9 | 18 | null;
  starting_hole: number | null;
  holes: GolfHole[];
  summary: GolfSummary | null;
}

export const DIRECTIONS: readonly Direction[] = ['left', 'right', 'short', 'long'];

const ROUND_STATUSES: readonly RoundStatus[] = ['setup', 'in_progress', 'complete'];

export const STATUS_PILL_TEXT: Record<RoundStatus, string> = {
  setup: 'Setting up',
  in_progress: 'In progress',
  complete: 'Complete',
};

/** Parse a JSON string from the agent. Returns null for the literal "null", invalid JSON,
 *  version !== 1, or a shape that fails light validation. Never throws. */
export function parseScorecard(raw: string): GolfScorecard | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (parsed === null || typeof parsed !== 'object') return null;

  const obj = parsed as Record<string, unknown>;

  if (obj.version !== 1) return null;
  if (!ROUND_STATUSES.includes(obj.status as RoundStatus)) return null;
  if (!Array.isArray(obj.holes)) return null;
  for (const hole of obj.holes) {
    if (hole === null || typeof hole !== 'object') return null;
    if (typeof (hole as Record<string, unknown>).number !== 'number') return null;
  }
  for (const key of ['course', 'tee', 'summary'] as const) {
    const value = obj[key];
    if (value !== null && typeof value !== 'object') return null;
  }

  return obj as unknown as GolfScorecard;
}

/** 0 → 'E', 3 → '+3', -1 → '-1' */
export function formatToPar(scoreToPar: number): string {
  if (scoreToPar === 0) return 'E';
  return scoreToPar > 0 ? `+${scoreToPar}` : `${scoreToPar}`;
}

/** score_to_par if non-null, else strokes - par when both known, else null */
export function holeScoreToPar(hole: GolfHole): number | null {
  if (hole.score_to_par !== null) return hole.score_to_par;
  if (hole.strokes !== null && hole.par !== null) return hole.strokes - hole.par;
  return null;
}

export type ScoreMarkKind = 'eagle' | 'birdie' | 'par' | 'bogey' | 'double';

/** ≤-2 eagle, -1 birdie, 0 par, +1 bogey, ≥+2 double; null → null */
export function scoreMarkKind(scoreToPar: number | null): ScoreMarkKind | null {
  if (scoreToPar === null) return null;
  if (scoreToPar <= -2) return 'eagle';
  if (scoreToPar === -1) return 'birdie';
  if (scoreToPar === 0) return 'par';
  if (scoreToPar === 1) return 'bogey';
  return 'double';
}

export type NineKey = 'front' | 'back';

export interface NineGroup {
  nine: NineKey;
  label: 'Out' | 'In';
  holes: GolfHole[];
}

/** Groups holes by nine (1–9 → front/'Out', 10–18 → back/'In'), preserving PLAY order:
 *  groups appear in the order their first hole appears in `holes`, holes keep their order.
 *  Empty groups are omitted. */
export function groupHolesByNine(holes: GolfHole[]): NineGroup[] {
  const groups: NineGroup[] = [];
  const indexByNine = new Map<NineKey, number>();

  for (const hole of holes) {
    const nine: NineKey = hole.number <= 9 ? 'front' : 'back';
    let index = indexByNine.get(nine);
    if (index === undefined) {
      index = groups.length;
      indexByNine.set(nine, index);
      groups.push({ nine, label: nine === 'front' ? 'Out' : 'In', holes: [] });
    }
    groups[index].holes.push(hole);
  }

  return groups;
}

/** Number of the first hole in play order with strokes === null, or null if all recorded. */
export function nextUnrecordedHoleNumber(holes: GolfHole[]): number | null {
  for (const hole of holes) {
    if (hole.strokes === null) return hole.number;
  }
  return null;
}

/** Direction with the highest count; null if all zero. Ties resolve in DIRECTIONS order. */
export function mostCommonMiss(misses: MissCounts): Direction | null {
  let best: Direction | null = null;
  let bestCount = 0;
  for (const direction of DIRECTIONS) {
    const count = misses[direction];
    if (count > bestCount) {
      best = direction;
      bestCount = count;
    }
  }
  return best;
}

/** Rounded integer percent, or null when possible === 0. */
export function percentage(hit: number, possible: number): number | null {
  if (possible === 0) return null;
  return Math.round((hit / possible) * 100);
}

/** Sum of the non-null values of `key` over holes; null if every value is null. */
export function sumHoles(holes: GolfHole[], key: 'par' | 'yardage'): number | null {
  let sum = 0;
  let sawValue = false;
  for (const hole of holes) {
    const value = hole[key];
    if (value !== null) {
      sum += value;
      sawValue = true;
    }
  }
  return sawValue ? sum : null;
}

function formatCell(value: number | null): string {
  return value === null ? '-' : String(value);
}

/** Putts cell for the text export: "-" when the hole isn't recorded, "?" when it's recorded but
 *  the golfer didn't remember, otherwise the count. */
function formatPuttsCell(hole: GolfHole): string {
  if (hole.strokes === null) return '-';
  return hole.putts === null ? '?' : String(hole.putts);
}

function padLabel(label: string): string {
  return label.padEnd(6);
}

function padCell(cell: string): string {
  return cell.padStart(3);
}

function formatCourseLine(course: GolfCourse | null): string {
  if (course === null) return 'Unknown course';
  const location = [course.city, course.state].filter((part): part is string => part !== null);
  return location.length > 0 ? `${course.name} — ${location.join(', ')}` : course.name;
}

function formatTeeLine(tee: GolfTee): string {
  const parts = [`Tees: ${tee.name}`];
  if (tee.yardage !== null) parts.push(`${tee.yardage} yds`);
  if (tee.course_rating !== null && tee.slope !== null) {
    parts.push(`${tee.course_rating}/${tee.slope}`);
  }
  return parts.join(' · ');
}

function formatSummaryLine(card: GolfScorecard): string {
  const parts: string[] = [];
  if (card.holes_played !== null) parts.push(`${card.holes_played} holes`);
  parts.push(STATUS_PILL_TEXT[card.status]);
  return parts.join(' · ');
}

function formatNineBlock(group: NineGroup, card: GolfScorecard): string[] {
  const nineSummary =
    card.summary === null
      ? null
      : group.nine === 'front'
        ? card.summary.front_nine
        : card.summary.back_nine;

  const holeRow =
    padLabel('Hole') +
    group.holes.map((h) => padCell(String(h.number))).join('') +
    padCell(group.label);
  const parRow =
    padLabel('Par') +
    group.holes.map((h) => padCell(formatCell(h.par))).join('') +
    padCell(formatCell(sumHoles(group.holes, 'par')));
  const scoreRow =
    padLabel('Score') +
    group.holes.map((h) => padCell(formatCell(h.strokes))).join('') +
    padCell(formatCell(nineSummary?.strokes ?? null));
  const puttsRow =
    padLabel('Putts') +
    group.holes.map((h) => padCell(formatPuttsCell(h))).join('') +
    padCell(formatCell(nineSummary?.putts ?? null));

  return [holeRow, parRow, scoreRow, puttsRow];
}

function formatTotalLine(summary: GolfSummary): string {
  return [
    `Total: ${summary.total_strokes} (${formatToPar(summary.score_to_par)})`,
    `Putts: ${summary.total_putts}`,
    `Fairways: ${summary.fairways_hit}/${summary.fairways_possible}`,
    `GIR: ${summary.greens_hit}/${summary.greens_possible}`,
  ].join(' · ');
}

/** Plain-text scorecard for the clipboard (see format below). */
export function formatScorecardText(card: GolfScorecard): string {
  const lines: string[] = [formatCourseLine(card.course)];
  if (card.tee !== null) lines.push(formatTeeLine(card.tee));
  lines.push(formatSummaryLine(card));
  lines.push('');

  const groups = groupHolesByNine(card.holes);
  groups.forEach((group, index) => {
    lines.push(...formatNineBlock(group, card));
    if (index < groups.length - 1) lines.push('');
  });

  if (card.summary !== null) {
    lines.push('');
    lines.push(formatTotalLine(card.summary));
  }

  return lines.join('\n');
}
