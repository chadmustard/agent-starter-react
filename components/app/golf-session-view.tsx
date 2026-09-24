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
  style,
  themeMode,
  preConnectMessage,
  supportsChatInput,
  supportsVideoInput,
  supportsScreenShare,
  isPreConnectBufferEnabled,
  audioVisualizerType,
  audioVisualizerColor,
  audioVisualizerColorShift,
  audioVisualizerBarCount,
  audioVisualizerGridRowCount,
  audioVisualizerGridColumnCount,
  audioVisualizerRadialBarCount,
  audioVisualizerRadialRadius,
  audioVisualizerWaveLineWidth,
}: React.ComponentProps<'section'> & AgentSessionView_01Props) {
  const { scorecard } = useGolfScorecard();

  // Only pass through the props AgentSessionView_01 actually declares. `motion.create` injects a
  // `style` prop (and animates the ref'd DOM node imperatively) onto *this* component; if `style`
  // (or other arbitrary section DOM props) were spread onto AgentSessionView_01 instead, its own
  // inner `<section>` — not the one motion is animating — would be frozen at the initial variant
  // (e.g. `opacity: 0`) since motion never touches that inner node.
  const sessionViewProps: AgentSessionView_01Props = {
    themeMode,
    preConnectMessage,
    supportsChatInput,
    supportsVideoInput,
    supportsScreenShare,
    isPreConnectBufferEnabled,
    audioVisualizerType,
    audioVisualizerColor,
    audioVisualizerColorShift,
    audioVisualizerBarCount,
    audioVisualizerGridRowCount,
    audioVisualizerGridColumnCount,
    audioVisualizerRadialBarCount,
    audioVisualizerRadialRadius,
    audioVisualizerWaveLineWidth,
  };

  return (
    <section
      ref={ref}
      style={style}
      className={cn('flex h-full w-full flex-col lg:flex-row', className)}
    >
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
          className="bg-background lg:border-border min-h-0 flex-1 overflow-y-auto p-4 md:p-6 lg:w-[min(56rem,60%)] lg:flex-none lg:border-l lg:pt-20 xl:w-[min(64rem,64%)]"
        >
          <ScorecardPanel scorecard={scorecard} />
        </motion.aside>
      )}
    </section>
  );
}
