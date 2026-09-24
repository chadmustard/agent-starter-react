import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EIGHTEEN_HOLES_MIXED, NINE_HOLES_FROM_TEN } from '@/lib/golf/fixtures';
import type { GolfScorecard } from '@/lib/golf/scorecard';
import { HoleGrid } from './hole-grid';

function columnHeaderLabels(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('thead th')).map((el) => el.textContent ?? '');
}

function getRow(rowLabel: string): HTMLTableRowElement {
  const rowHeader = screen.getByRole('rowheader', { name: rowLabel });
  const row = rowHeader.closest('tr');
  if (row === null) throw new Error(`row not found for label "${rowLabel}"`);
  return row;
}

function getColumnIndex(container: HTMLElement, columnLabel: string): number {
  const headerCells = Array.from(container.querySelectorAll('thead th'));
  const index = headerCells.findIndex((el) => el.textContent === columnLabel);
  if (index === -1) throw new Error(`column not found: "${columnLabel}"`);
  return index;
}

function getCellText(container: HTMLElement, rowLabel: string, columnLabel: string): string {
  const row = getRow(rowLabel);
  const index = getColumnIndex(container, columnLabel);
  const cells = row.querySelectorAll('th, td');
  return cells[index]?.textContent ?? '';
}

describe('HoleGrid', () => {
  it('renders a 9-hole round starting on 10 with the correct columns and marks', () => {
    const { container } = render(<HoleGrid scorecard={NINE_HOLES_FROM_TEN} />);

    expect(columnHeaderLabels(container)).toEqual([
      'Hole',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      'In',
      'Total',
    ]);
    expect(screen.queryByRole('columnheader', { name: 'Out' })).not.toBeInTheDocument();

    const nextHoleHeader = container.querySelector('[data-hole-number="15"]');
    expect(nextHoleHeader).not.toBeNull();
    expect(nextHoleHeader).toHaveAttribute('data-next-hole', 'true');
    expect(nextHoleHeader).toHaveAttribute('aria-current', 'step');

    // Hole 11: strokes 4, par 5, score_to_par -1 -> birdie.
    const birdieMark = screen.getByLabelText('4, birdie');
    expect(birdieMark).toHaveAttribute('data-mark', 'birdie');

    // Hole 13: strokes 5, par 4, score_to_par 1 -> bogey.
    const bogeyMark = screen.getByLabelText('5, bogey');
    expect(bogeyMark).toHaveAttribute('data-mark', 'bogey');

    // Hole 12 is a par 3 -> fairway is not applicable.
    expect(screen.getByLabelText('Not applicable')).toBeInTheDocument();

    // Hole 13 fairway miss left, hole 12 green miss short.
    expect(screen.getByLabelText('Missed left')).toBeInTheDocument();
    expect(screen.getByLabelText('Missed short')).toBeInTheDocument();

    // Hole 15 (unrecorded) Score cell is empty.
    expect(getCellText(container, 'Score', '15')).toBe('');
    expect(getCellText(container, 'Score', '16')).toBe('');
  });

  it('renders an 18-hole mixed round with Out/In subtotals and a Total column', () => {
    const { container } = render(<HoleGrid scorecard={EIGHTEEN_HOLES_MIXED} />);

    expect(columnHeaderLabels(container)).toEqual([
      'Hole',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'Out',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      'In',
      'Total',
    ]);

    // Hole 4: strokes 3, par 5, score_to_par -2 -> eagle or better.
    expect(screen.getByLabelText('3, eagle')).toHaveAttribute('data-mark', 'eagle');
    // Hole 8: strokes 8, par 5, score_to_par 3 -> double bogey or worse.
    expect(screen.getByLabelText('8, double bogey or worse')).toHaveAttribute(
      'data-mark',
      'double'
    );

    const nextHoleHeader = container.querySelector('[data-hole-number="12"]');
    expect(nextHoleHeader).toHaveAttribute('data-next-hole', 'true');

    expect(getCellText(container, 'Score', 'Out')).toBe(
      String(EIGHTEEN_HOLES_MIXED.summary?.front_nine?.strokes)
    );

    const totalPar = EIGHTEEN_HOLES_MIXED.holes.reduce((sum, hole) => sum + (hole.par ?? 0), 0);
    expect(getCellText(container, 'Par', 'Total')).toBe(String(totalPar));
  });

  it('renders an 18-hole round starting on 10 (back nine then front nine) in play order', () => {
    const startingOnTenEighteen: GolfScorecard = {
      ...EIGHTEEN_HOLES_MIXED,
      starting_hole: 10,
      holes: [...EIGHTEEN_HOLES_MIXED.holes.slice(9), ...EIGHTEEN_HOLES_MIXED.holes.slice(0, 9)],
    };
    const { container } = render(<HoleGrid scorecard={startingOnTenEighteen} />);

    expect(columnHeaderLabels(container)).toEqual([
      'Hole',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      'In',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'Out',
      'Total',
    ]);
  });

  it('flashes a hole cell that goes from unrecorded to recorded, but not on initial mount', () => {
    const { container, rerender } = render(<HoleGrid scorecard={NINE_HOLES_FROM_TEN} />);

    // Nothing should be flashing right after the initial mount, including already-recorded holes.
    expect(container.querySelector('[data-flash]')).not.toBeInTheDocument();

    const scoreIndex = getColumnIndex(container, '15');
    const scoreCell = () => getRow('Score').querySelectorAll('th, td')[scoreIndex];

    // Hole 15 starts unrecorded: no score mark yet.
    expect(scoreCell()?.textContent).toBe('');

    const holeNumber = 15;
    const recordedHoles = NINE_HOLES_FROM_TEN.holes.map((hole) =>
      hole.number === holeNumber
        ? {
            ...hole,
            strokes: 4,
            putts: 2,
            fairway: 'hit' as const,
            green: 'hit' as const,
            score_to_par: 0,
          }
        : hole
    );
    rerender(<HoleGrid scorecard={{ ...NINE_HOLES_FROM_TEN, holes: recordedHoles }} />);

    // Recording the hole should flash its Score cell, and only that cell.
    expect(scoreCell()?.querySelector('[data-flash="true"]')).not.toBeNull();

    const untouchedHoleIndex = getColumnIndex(container, '10');
    const untouchedScoreCell = getRow('Score').querySelectorAll('th, td')[untouchedHoleIndex];
    expect(untouchedScoreCell?.querySelector('[data-flash="true"]')).toBeNull();
  });

  it('renders "?" for putts/fairway/green the golfer didn\'t remember on a recorded par 4', () => {
    // Hole 10 is a recorded par 4 (fairway 'hit', green 'hit', putts 2 in the fixture);
    // null these out to simulate a hole the golfer recorded but couldn't recall the details of.
    const holesWithUnrememberedTen = NINE_HOLES_FROM_TEN.holes.map((hole) =>
      hole.number === 10 ? { ...hole, putts: null, fairway: null, green: null } : hole
    );
    render(<HoleGrid scorecard={{ ...NINE_HOLES_FROM_TEN, holes: holesWithUnrememberedTen }} />);

    expect(screen.getAllByLabelText('Not remembered')).toHaveLength(3);
  });

  it('keeps "Not applicable" for a recorded par 3\'s fairway (not "Not remembered")', () => {
    // Hole 12 in the fixture is a recorded par 3 with fairway: null already.
    render(<HoleGrid scorecard={NINE_HOLES_FROM_TEN} />);

    expect(screen.getByLabelText('Not applicable')).toBeInTheDocument();
    expect(screen.queryByLabelText('Not remembered')).not.toBeInTheDocument();
  });
});
