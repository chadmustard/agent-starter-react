'use client';

import { useEffect, useRef, useState } from 'react';
import { RoomEvent } from 'livekit-client';
import { useAgent, useSessionContext } from '@livekit/components-react';
import { type GolfScorecard, parseScorecard } from '@/lib/golf/scorecard';

export interface UseGolfScorecardResult {
  scorecard: GolfScorecard | null;
  isLoading: boolean;
}

const SCORECARD_TOPIC = 'golf.scorecard';
const GET_SCORECARD_METHOD = 'golf.get_scorecard';
const RETRY_DELAYS_MS = [500, 1000, 2000, 4000];

/**
 * Owns the golf scorecard state pushed by the agent: the live `golf.scorecard` text stream, plus
 * a `golf.get_scorecard` RPC used to catch up on connect/reconnect. A monotonic counter of
 * accepted stream messages lets a catch-up RPC that resolves late defer to a newer stream update.
 */
export function useGolfScorecard(): UseGolfScorecardResult {
  const { room } = useSessionContext();
  const agent = useAgent();
  const agentIdentity = agent.internal.agentParticipant?.identity;

  const [scorecard, setScorecard] = useState<GolfScorecard | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const streamCounterRef = useRef(0);
  const fetchGenerationRef = useRef(0);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Text stream: every accepted message replaces state ("latest wins").
  useEffect(() => {
    let cancelled = false;

    const handleMessage = async (reader: { readAll: () => Promise<string> }) => {
      try {
        const raw = await reader.readAll();
        if (cancelled) return;
        const parsed = parseScorecard(raw);
        if (parsed === null) {
          console.warn('useGolfScorecard: ignoring malformed golf.scorecard message');
          return;
        }
        streamCounterRef.current += 1;
        setScorecard(parsed);
        setIsLoading(false);
      } catch (err) {
        console.warn('useGolfScorecard: failed to read golf.scorecard message', err);
      }
    };

    try {
      room.registerTextStreamHandler(SCORECARD_TOPIC, handleMessage);
    } catch (err) {
      console.warn('useGolfScorecard: failed to register golf.scorecard stream handler', err);
    }

    return () => {
      cancelled = true;
      room.unregisterTextStreamHandler(SCORECARD_TOPIC);
    };
  }, [room]);

  // Catch-up RPC: fetch whenever the agent identity (re)appears, and again on every reconnect.
  useEffect(() => {
    if (!agentIdentity) return;

    const startFetch = () => {
      if (retryTimeoutRef.current !== undefined) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = undefined;
      }
      fetchGenerationRef.current += 1;
      const generation = fetchGenerationRef.current;

      const attempt = async (attemptIndex: number) => {
        const counterAtStart = streamCounterRef.current;
        try {
          const raw = await room.localParticipant.performRpc({
            destinationIdentity: agentIdentity,
            method: GET_SCORECARD_METHOD,
            payload: '',
          });
          if (fetchGenerationRef.current !== generation) return; // superseded

          // A stream message that arrived while this RPC was in flight is newer; keep it.
          if (streamCounterRef.current === counterAtStart) {
            const parsed = parseScorecard(raw);
            // A "null" response never clears an existing scorecard.
            if (parsed !== null) setScorecard(parsed);
          }
          setIsLoading(false);
        } catch (err) {
          if (fetchGenerationRef.current !== generation) return;
          if (attemptIndex < RETRY_DELAYS_MS.length) {
            retryTimeoutRef.current = setTimeout(
              () => attempt(attemptIndex + 1),
              RETRY_DELAYS_MS[attemptIndex]
            );
          } else {
            console.warn('useGolfScorecard: giving up on catch-up RPC after retries', err);
            setIsLoading(false);
          }
        }
      };

      attempt(0);
    };

    startFetch();
    room.on(RoomEvent.Reconnected, startFetch);

    return () => {
      fetchGenerationRef.current += 1; // invalidate any in-flight attempt / pending retry
      if (retryTimeoutRef.current !== undefined) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = undefined;
      }
      room.off(RoomEvent.Reconnected, startFetch);
    };
  }, [room, agentIdentity]);

  return { scorecard, isLoading };
}
