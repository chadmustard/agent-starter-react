'use client';

import { motion } from 'motion/react';
import {
  AgentSessionView_01,
  type AgentSessionView_01Props,
} from '@/components/agents-ui/blocks/agent-session-view-01';
import { useGolfScorecard } from '@/hooks/useGolfScorecard';
import { cn } from '@/lib/shadcn/utils';
import { ScorecardPanel } from './scorecard/scorecard-panel';

/**
 * Wraps `AgentSessionView_01` with the golf scorecard panel: mounted only while connected (it
 * replaces the plain session view in `view-controller.tsx`), so `useGolfScorecard` registers its
 * stream handler for the session's lifetime and unregisters it on disconnect.
 *
 * Before the first scorecard payload the session view fills the whole container, exactly as
 * before. Once a scorecard exists, the panel appears below the session view on mobile and to its
 * right on large screens.
 */
export function GolfSessionView({
  ref,
  className,
  ...sessionViewProps
}: React.ComponentProps<'section'> & AgentSessionView_01Props) {
  const { scorecard } = useGolfScorecard();

  return (
    <section ref={ref} className={cn('flex h-full w-full flex-col lg:flex-row', className)}>
      <div
        className={cn(
          'relative min-h-0 flex-1',
          scorecard !== null && 'h-[45svh] flex-none lg:h-auto lg:flex-1'
        )}
      >
        <AgentSessionView_01 {...sessionViewProps} />
      </div>
      {scorecard !== null && (
        <motion.aside
          aria-label="Scorecard"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-background lg:border-border min-h-0 flex-1 overflow-y-auto p-4 md:p-6 md:pt-20 lg:w-[min(56rem,60%)] lg:flex-none lg:border-l"
        >
          <ScorecardPanel scorecard={scorecard} />
        </motion.aside>
      )}
    </section>
  );
}
