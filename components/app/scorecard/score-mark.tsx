import { scoreMarkKind } from '@/lib/golf/scorecard';
import { cn } from '@/lib/shadcn/utils';

export interface ScoreMarkProps {
  /** Strokes taken on the hole. `null` renders nothing (empty cell). */
  strokes: number | null;
  /** Strokes relative to par, used to pick the mark (birdie/eagle/par/bogey/double). */
  scoreToPar: number | null;
  className?: string;
}

const KIND_LABEL = {
  eagle: 'eagle',
  birdie: 'birdie',
  par: 'par',
  bogey: 'bogey',
  double: 'double bogey or worse',
} as const;

/**
 * Renders a hole's stroke count inside the traditional golf scorecard marks:
 * a circle for birdie (double circle for eagle or better), a square for bogey
 * (double square for double bogey or worse), and plain text for par.
 */
export function ScoreMark({ strokes, scoreToPar, className }: ScoreMarkProps) {
  if (strokes === null) return null;

  const kind = scoreMarkKind(scoreToPar);
  const label = kind === null ? String(strokes) : `${strokes}, ${KIND_LABEL[kind]}`;

  return (
    <span
      data-mark={kind ?? undefined}
      aria-label={label}
      className={cn(
        'relative inline-flex size-6 shrink-0 items-center justify-center text-sm tabular-nums',
        className
      )}
    >
      {kind === 'birdie' && (
        <span className="absolute inset-0 rounded-full border border-current" aria-hidden="true" />
      )}
      {kind === 'eagle' && (
        <>
          <span
            className="absolute inset-0 rounded-full border border-current"
            aria-hidden="true"
          />
          <span
            className="absolute inset-0 rounded-full outline outline-1 outline-offset-2 outline-current"
            aria-hidden="true"
          />
        </>
      )}
      {kind === 'bogey' && (
        <span className="absolute inset-0 border border-current" aria-hidden="true" />
      )}
      {kind === 'double' && (
        <>
          <span className="absolute inset-0 border border-current" aria-hidden="true" />
          <span
            className="absolute inset-0 outline outline-1 outline-offset-2 outline-current"
            aria-hidden="true"
          />
        </>
      )}
      <span className="relative">{strokes}</span>
    </span>
  );
}
