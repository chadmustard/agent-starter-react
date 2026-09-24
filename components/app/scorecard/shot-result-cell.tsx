import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  CheckIcon,
} from '@phosphor-icons/react/dist/ssr';
import type { Direction, ShotResult } from '@/lib/golf/scorecard';
import { cn } from '@/lib/shadcn/utils';

export interface ShotResultCellProps {
  /** The recorded shot result. `null` renders nothing (empty cell). */
  result: ShotResult | null;
  /** True when the shot doesn't apply to this hole (e.g. fairway on a par 3). */
  notApplicable?: boolean;
  className?: string;
}

export const DIRECTION_ICON: Record<Direction, typeof ArrowLeftIcon> = {
  left: ArrowLeftIcon,
  right: ArrowRightIcon,
  short: ArrowDownIcon,
  long: ArrowUpIcon,
};

const DIRECTION_LABEL: Record<Direction, string> = {
  left: 'Missed left',
  right: 'Missed right',
  short: 'Missed short',
  long: 'Missed long',
};

/** Renders a fairway/green shot result: a check for a hit, a directional arrow for a miss,
 *  an em dash for holes where the shot doesn't apply, or nothing when not recorded. */
export function ShotResultCell({ result, notApplicable = false, className }: ShotResultCellProps) {
  if (notApplicable) {
    return (
      <span aria-label="Not applicable" className={cn('text-muted-foreground', className)}>
        —
      </span>
    );
  }

  if (result === null) return null;

  if (result === 'hit') {
    return (
      <span aria-label="Hit" className={cn('inline-flex items-center justify-center', className)}>
        <CheckIcon weight="bold" className="text-primary size-4" />
      </span>
    );
  }

  const Icon = DIRECTION_ICON[result];
  return (
    <span
      aria-label={DIRECTION_LABEL[result]}
      className={cn('inline-flex items-center justify-center', className)}
    >
      <Icon weight="bold" className="text-muted-foreground size-4" />
    </span>
  );
}
