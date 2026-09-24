import { Fragment, type ReactNode } from 'react';
import {
  type GolfHole,
  type GolfScorecard,
  type GolfSummary,
  type NineGroup,
  type NineKey,
  groupHolesByNine,
  holeScoreToPar,
  nextUnrecordedHoleNumber,
  sumHoles,
} from '@/lib/golf/scorecard';
import { cn } from '@/lib/shadcn/utils';
import { FlashOnChange } from './flash-on-change';
import { ScoreMark } from './score-mark';
import { ShotResultCell } from './shot-result-cell';

export interface HoleGridProps {
  scorecard: GolfScorecard;
  className?: string;
}

const LABEL_CELL_CLASS = 'sticky left-0 z-10 bg-background px-2 py-1.5 text-left font-medium';
const SUBTOTAL_CELL_CLASS = 'bg-muted font-semibold';

function nineSummaryFor(summary: GolfSummary | null, nine: NineKey) {
  if (summary === null) return null;
  return nine === 'front' ? summary.front_nine : summary.back_nine;
}

/** A numeric value that should render empty when the round summary isn't underway yet. */
function summaryValue(
  summary: GolfSummary | null,
  value: number | null | undefined
): number | null {
  if (summary === null || summary.holes_completed === 0) return null;
  return value ?? null;
}

function formatNullable(value: number | null): string {
  return value === null ? '' : String(value);
}

interface DataRowProps {
  label: string;
  groups: NineGroup[];
  nextHoleNumber: number | null;
  renderHole: (hole: GolfHole) => ReactNode;
  renderSubtotal: (group: NineGroup) => ReactNode;
  renderTotal: () => ReactNode;
}

function DataRow({
  label,
  groups,
  nextHoleNumber,
  renderHole,
  renderSubtotal,
  renderTotal,
}: DataRowProps) {
  return (
    <tr>
      <th scope="row" className={LABEL_CELL_CLASS}>
        {label}
      </th>
      {groups.map((group) => (
        <Fragment key={group.nine}>
          {group.holes.map((hole) => {
            const isNextHole = hole.number === nextHoleNumber;
            const isUnrecorded = hole.strokes === null;
            const dim = isUnrecorded && !isNextHole;
            return (
              <td
                key={hole.number}
                className={cn(
                  'min-w-8 px-2 py-1.5 text-center tabular-nums',
                  isNextHole && 'bg-primary/10',
                  dim && 'text-muted-foreground/70'
                )}
              >
                {renderHole(hole)}
              </td>
            );
          })}
          <td className={cn('min-w-8 px-2 py-1.5 text-center tabular-nums', SUBTOTAL_CELL_CLASS)}>
            {renderSubtotal(group)}
          </td>
        </Fragment>
      ))}
      <td className={cn('min-w-8 px-2 py-1.5 text-center tabular-nums', SUBTOTAL_CELL_CLASS)}>
        {renderTotal()}
      </td>
    </tr>
  );
}

/**
 * Renders a scorecard's holes as a traditional golf scorecard table: one column per hole, grouped
 * into nines with Out/In subtotals and a final Total column, inside a horizontally scrollable
 * wrapper. Presentational only — consumes `scorecard` and the pure helpers from `lib/golf/scorecard`.
 */
export function HoleGrid({ scorecard, className }: HoleGridProps) {
  const groups = groupHolesByNine(scorecard.holes);
  const nextHoleNumber = nextUnrecordedHoleNumber(scorecard.holes);
  const summary = scorecard.summary;

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th scope="col" className={LABEL_CELL_CLASS}>
              Hole
            </th>
            {groups.map((group) => (
              <Fragment key={group.nine}>
                {group.holes.map((hole) => {
                  const isNextHole = hole.number === nextHoleNumber;
                  return (
                    <th
                      key={hole.number}
                      scope="col"
                      data-hole-number={hole.number}
                      data-next-hole={isNextHole ? 'true' : undefined}
                      aria-current={isNextHole ? 'step' : undefined}
                      className={cn(
                        'min-w-8 px-2 py-1.5 text-center font-medium tabular-nums',
                        isNextHole && 'bg-primary/10 ring-primary ring-2 ring-inset'
                      )}
                    >
                      {hole.number}
                    </th>
                  );
                })}
                <th
                  scope="col"
                  className={cn('min-w-8 px-2 py-1.5 text-center', SUBTOTAL_CELL_CLASS)}
                >
                  {group.label}
                </th>
              </Fragment>
            ))}
            <th scope="col" className={cn('min-w-8 px-2 py-1.5 text-center', SUBTOTAL_CELL_CLASS)}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          <DataRow
            label="Par"
            groups={groups}
            nextHoleNumber={nextHoleNumber}
            renderHole={(hole) => formatNullable(hole.par)}
            renderSubtotal={(group) => formatNullable(sumHoles(group.holes, 'par'))}
            renderTotal={() => formatNullable(sumHoles(scorecard.holes, 'par'))}
          />
          <DataRow
            label="Yards"
            groups={groups}
            nextHoleNumber={nextHoleNumber}
            renderHole={(hole) => formatNullable(hole.yardage)}
            renderSubtotal={(group) => formatNullable(sumHoles(group.holes, 'yardage'))}
            renderTotal={() => formatNullable(sumHoles(scorecard.holes, 'yardage'))}
          />
          <DataRow
            label="Handicap"
            groups={groups}
            nextHoleNumber={nextHoleNumber}
            renderHole={(hole) => formatNullable(hole.handicap)}
            renderSubtotal={() => ''}
            renderTotal={() => ''}
          />
          <DataRow
            label="Score"
            groups={groups}
            nextHoleNumber={nextHoleNumber}
            renderHole={(hole) =>
              hole.strokes === null ? null : (
                <FlashOnChange value={hole.strokes}>
                  <ScoreMark strokes={hole.strokes} scoreToPar={holeScoreToPar(hole)} />
                </FlashOnChange>
              )
            }
            renderSubtotal={(group) => {
              const value = summaryValue(summary, nineSummaryFor(summary, group.nine)?.strokes);
              return value === null ? '' : <FlashOnChange value={value}>{value}</FlashOnChange>;
            }}
            renderTotal={() => {
              const value = summaryValue(summary, summary?.total_strokes);
              return value === null ? '' : <FlashOnChange value={value}>{value}</FlashOnChange>;
            }}
          />
          <DataRow
            label="Putts"
            groups={groups}
            nextHoleNumber={nextHoleNumber}
            renderHole={(hole) =>
              hole.putts === null ? null : (
                <FlashOnChange value={hole.putts}>{hole.putts}</FlashOnChange>
              )
            }
            renderSubtotal={(group) => {
              const value = summaryValue(summary, nineSummaryFor(summary, group.nine)?.putts);
              return value === null ? '' : <FlashOnChange value={value}>{value}</FlashOnChange>;
            }}
            renderTotal={() => {
              const value = summaryValue(summary, summary?.total_putts);
              return value === null ? '' : <FlashOnChange value={value}>{value}</FlashOnChange>;
            }}
          />
          <DataRow
            label="Fairway"
            groups={groups}
            nextHoleNumber={nextHoleNumber}
            renderHole={(hole) =>
              hole.strokes === null ? null : (
                <FlashOnChange value={hole.fairway}>
                  <ShotResultCell result={hole.fairway} notApplicable={hole.par === 3} />
                </FlashOnChange>
              )
            }
            renderSubtotal={() => ''}
            renderTotal={() =>
              summary === null ? '' : `${summary.fairways_hit}/${summary.fairways_possible}`
            }
          />
          <DataRow
            label="Green"
            groups={groups}
            nextHoleNumber={nextHoleNumber}
            renderHole={(hole) =>
              hole.strokes === null ? null : (
                <FlashOnChange value={hole.green}>
                  <ShotResultCell result={hole.green} />
                </FlashOnChange>
              )
            }
            renderSubtotal={() => ''}
            renderTotal={() =>
              summary === null ? '' : `${summary.greens_hit}/${summary.greens_possible}`
            }
          />
        </tbody>
      </table>
    </div>
  );
}
