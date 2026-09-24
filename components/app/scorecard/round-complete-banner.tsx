'use client';

import { toast } from 'sonner';
import { CopyIcon } from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { type GolfScorecard, formatScorecardText, formatToPar } from '@/lib/golf/scorecard';
import { cn } from '@/lib/shadcn/utils';

export interface RoundCompleteBannerProps {
  scorecard: GolfScorecard;
  className?: string;
}

/** Shown once the round is complete: final score and a button to copy the plain-text scorecard
 *  to the clipboard. Renders nothing until `status === 'complete'`. */
export function RoundCompleteBanner({ scorecard, className }: RoundCompleteBannerProps) {
  if (scorecard.status !== 'complete') return null;

  const { summary } = scorecard;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(formatScorecardText(scorecard));
      toast.success('Scorecard copied');
    } catch {
      toast.error('Could not copy scorecard');
    }
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-md bg-green-500/10 px-4 py-3',
        className
      )}
    >
      <div>
        <p className="text-foreground text-sm font-semibold">Round complete</p>
        {summary !== null && (
          <p className="text-muted-foreground text-sm">
            Final score {summary.total_strokes} ({formatToPar(summary.score_to_par)})
          </p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={handleCopy}>
        <CopyIcon weight="bold" />
        Copy scorecard
      </Button>
    </div>
  );
}
