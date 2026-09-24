import {
  type GolfCourse,
  type GolfScorecard,
  type RoundStatus,
  STATUS_PILL_TEXT,
} from '@/lib/golf/scorecard';
import { cn } from '@/lib/shadcn/utils';

export interface ScorecardHeaderProps {
  scorecard: GolfScorecard;
  className?: string;
}

const STATUS_PILL_CLASS: Record<RoundStatus, string> = {
  setup: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/10 text-primary',
  complete: 'bg-green-500/10 text-green-600 dark:bg-green-500/15 dark:text-green-400',
};

function StatusPill({ status }: { status: RoundStatus }) {
  return (
    <span
      className={cn(
        'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium',
        STATUS_PILL_CLASS[status]
      )}
    >
      {STATUS_PILL_TEXT[status]}
    </span>
  );
}

/** `city, state`, omitting whichever half is null; null when neither is present. */
function formatLocation(course: GolfCourse): string | null {
  const parts = [course.city, course.state].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(', ') : null;
}

/** Tee name, `<yardage> yds`, rating/slope, and `<holes_played> holes`, joined with ` · `. */
function formatMeta(scorecard: GolfScorecard): string | null {
  const { tee, holes_played } = scorecard;
  const parts: string[] = [];

  if (tee !== null) {
    parts.push(tee.name);
    if (tee.yardage !== null) parts.push(`${tee.yardage.toLocaleString('en-US')} yds`);
    if (tee.course_rating !== null && tee.slope !== null) {
      parts.push(`Rating ${tee.course_rating} / Slope ${tee.slope}`);
    } else if (tee.course_rating !== null) {
      parts.push(`Rating ${tee.course_rating}`);
    } else if (tee.slope !== null) {
      parts.push(`Slope ${tee.slope}`);
    }
  }

  if (holes_played !== null) parts.push(`${holes_played} holes`);

  return parts.length > 0 ? parts.join(' · ') : null;
}

/** The scorecard's course/tee identity and round status, or a setup placeholder before a
 *  course has been chosen. Presentational only. */
export function ScorecardHeader({ scorecard, className }: ScorecardHeaderProps) {
  const { status, course } = scorecard;

  if (status === 'setup' && course === null) {
    return (
      <div className={cn('flex items-start justify-between gap-4', className)}>
        <p className="text-muted-foreground text-sm">Tell your caddie which course you played</p>
        <StatusPill status={status} />
      </div>
    );
  }

  const location = course !== null ? formatLocation(course) : null;
  const meta = formatMeta(scorecard);

  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div>
        <h2 className="text-foreground text-lg font-semibold">
          {course?.name ?? 'Unknown course'}
        </h2>
        {location !== null && <p className="text-muted-foreground text-sm">{location}</p>}
        {meta !== null && <p className="text-muted-foreground text-sm">{meta}</p>}
      </div>
      <StatusPill status={status} />
    </div>
  );
}
