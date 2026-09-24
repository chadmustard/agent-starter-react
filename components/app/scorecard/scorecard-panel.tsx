import type { GolfScorecard } from '@/lib/golf/scorecard';
import { cn } from '@/lib/shadcn/utils';
import { HoleGrid } from './hole-grid';
import { RoundCompleteBanner } from './round-complete-banner';
import { ScorecardHeader } from './scorecard-header';
import { ScorecardStats } from './scorecard-stats';

export interface ScorecardPanelProps {
  scorecard: GolfScorecard;
  className?: string;
}

/** Composes the scorecard header, complete banner, hole grid, and stats strip into a single
 *  card-like surface. Presentational only — the root is a plain `div` so callers (e.g. an
 *  `<aside>` landmark) control the semantic wrapper. */
export function ScorecardPanel({ scorecard, className }: ScorecardPanelProps) {
  return (
    <div
      className={cn(
        'bg-background border-border flex flex-col gap-4 rounded-lg border p-4',
        className
      )}
    >
      <ScorecardHeader scorecard={scorecard} />
      <RoundCompleteBanner scorecard={scorecard} />
      {scorecard.holes.length > 0 && <HoleGrid scorecard={scorecard} />}
      <ScorecardStats summary={scorecard.summary} />
      <p className="text-muted-foreground text-xs">
        <a
          href="https://opengolfapi.org/attribution"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          Course data © OpenStreetMap contributors (ODbL 1.0) via OpenGolfAPI
        </a>
      </p>
    </div>
  );
}
