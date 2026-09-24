'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/shadcn/utils';

export interface FlashOnChangeProps {
  /** The value to watch. A brief highlight plays whenever this changes (never on first mount). */
  value: unknown;
  children: ReactNode;
  className?: string;
}

const FLASH_TINT = 'rgba(250, 204, 21, 0.45)'; // amber-400, visible on light + dark backgrounds
const FLASH_TINT_TRANSPARENT = 'rgba(250, 204, 21, 0)';

/**
 * Wraps `children` in a `motion.span` and plays a brief (~0.8s) highlight — a scale pulse plus a
 * background tint fading out — whenever `value` changes after the initial mount. Respects
 * `useReducedMotion`: the scale pulse is skipped, but the tint still fades out.
 */
export function FlashOnChange({ value, children, className }: FlashOnChangeProps) {
  const prefersReducedMotion = useReducedMotion();
  const hasMountedRef = useRef(false);
  const previousValueRef = useRef(value);
  const [flashToken, setFlashToken] = useState(0);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      previousValueRef.current = value;
      return;
    }
    if (!Object.is(previousValueRef.current, value)) {
      previousValueRef.current = value;
      setFlashToken((token) => token + 1);
      setIsFlashing(true);
    }
  }, [value]);

  const shouldFlash = flashToken > 0;

  return (
    <motion.span
      key={flashToken}
      // Exposed for tests/tooling: reflects whether this element is currently mid-flash
      // (present the instant a change is detected, cleared once the highlight animation ends).
      data-flash={isFlashing ? 'true' : undefined}
      className={cn('inline-block rounded-sm', className)}
      initial={
        shouldFlash
          ? { backgroundColor: FLASH_TINT, scale: prefersReducedMotion ? 1 : 1.15 }
          : false
      }
      animate={{ backgroundColor: FLASH_TINT_TRANSPARENT, scale: 1 }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
      onAnimationComplete={() => setIsFlashing(false)}
    >
      {children}
    </motion.span>
  );
}
