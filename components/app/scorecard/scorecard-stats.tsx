import type { ReactNode } from 'react';
import {
  type Direction,
  type GolfSummary,
  type MissCounts,
  formatToPar,
  mostCommonMiss,
  percentage,
} from '@/lib/golf/scorecard';
import { cn } from '@/lib/shadcn/utils';
import { DIRECTION_ICON } from './shot-result-cell';

export interface ScorecardStatsProps {
  summary: GolfSummary | null;
  className?: string;
}

const DIRECTION_WORD: Record<Direction, string> = {
  left: 'Left',
  right: 'Right',
  short: 'Short',
  long: 'Long',
};

interface StatProps {
  label: string;
  title?: string;
  testId: string;
  children: ReactNode;
}

function Stat({ label, title, testId, children }: StatProps) {
  return (
    <div data-testid={testId} className="flex flex-col gap-0.5">
      <span title={title} className="text-muted-foreground text-xs">
        {label}
      </span>
      <span className="text-foreground text-sm font-medium">{children}</span>
    </div>
  );
}

function formatCountAndPercent(hit: number, possible: number): string {
  const pct = percentage(hit, possible);
  return pct === null ? `${hit}/${possible}` : `${hit}/${possible} (${pct}%)`;
}

function MissStat({
  label,
  testId,
  misses,
}: {
  label: string;
  testId: string;
  misses: MissCounts;
}) {
  const direction = mostCommonMiss(misses);

  return (
    <Stat label={label} testId={testId}>
      {direction === null ? (
        'None'
      ) : (
        <span className="inline-flex items-center gap-1">
          {(() => {
            const Icon = DIRECTION_ICON[direction];
            return <Icon weight="bold" className="text-muted-foreground size-4" />;
          })()}
          {DIRECTION_WORD[direction]}
        </span>
      )}
    </Stat>
  );
}

/** A responsive strip of round stats: score, putts, fairways/greens hit, and most common miss
 *  direction for each. Renders nothing when there's no summary yet. Presentational only. */
export function ScorecardStats({ summary, className }: ScorecardStatsProps) {
  if (summary === null) return null;

  return (
    <div
      className={cn('grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 md:grid-cols-6', className)}
    >
      <Stat label="Score" testId="stat-score">
        {summary.total_strokes} ({formatToPar(summary.score_to_par)})
        <span className="text-muted-foreground block text-xs font-normal">
          Thru {summary.holes_completed}
        </span>
      </Stat>
      <Stat label="Putts" testId="stat-putts">
        {summary.total_putts}
      </Stat>
      <Stat label="Fairways" testId="stat-fairways">
        {formatCountAndPercent(summary.fairways_hit, summary.fairways_possible)}
      </Stat>
      <Stat label="GIR" title="Greens in regulation" testId="stat-gir">
        {formatCountAndPercent(summary.greens_hit, summary.greens_possible)}
      </Stat>
      <MissStat label="Fairway miss" testId="stat-fairway-miss" misses={summary.fairway_misses} />
      <MissStat label="Green miss" testId="stat-green-miss" misses={summary.green_misses} />
    </div>
  );
}
