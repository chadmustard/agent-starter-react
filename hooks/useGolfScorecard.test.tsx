import { RoomEvent } from 'livekit-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { EIGHTEEN_HOLES_MIXED, NINE_HOLES_FROM_TEN } from '@/lib/golf/fixtures';
import { useGolfScorecard } from './useGolfScorecard';

type TextStreamCallback = (reader: { readAll: () => Promise<string> }) => void | Promise<void>;
type RoomEventCallback = (...args: unknown[]) => void;

function createFakeRoom() {
  const streamHandlers = new Map<string, TextStreamCallback>();
  const eventListeners = new Map<string, Set<RoomEventCallback>>();

  return {
    registerTextStreamHandler: vi.fn((topic: string, cb: TextStreamCallback) => {
      streamHandlers.set(topic, cb);
    }),
    unregisterTextStreamHandler: vi.fn((topic: string) => {
      streamHandlers.delete(topic);
    }),
    on: vi.fn((event: string, cb: RoomEventCallback) => {
      let set = eventListeners.get(event);
      if (!set) {
        set = new Set();
        eventListeners.set(event, set);
      }
      set.add(cb);
    }),
    off: vi.fn((event: string, cb: RoomEventCallback) => {
      eventListeners.get(event)?.delete(cb);
    }),
    localParticipant: {
      performRpc: vi.fn(),
    },
    // Test helpers, not part of the real Room API.
    __emitStream: (topic: string, reader: { readAll: () => Promise<string> }) => {
      return streamHandlers.get(topic)?.(reader);
    },
    __emit: (event: string) => {
      eventListeners.get(event)?.forEach((cb) => cb());
    },
  };
}

type FakeRoom = ReturnType<typeof createFakeRoom>;

let fakeRoom: FakeRoom;
let agentIdentity: string | undefined = 'agent-1';

vi.mock('@livekit/components-react', () => ({
  useSessionContext: () => ({ room: fakeRoom }),
  useAgent: () => ({
    internal: {
      agentParticipant: agentIdentity ? { identity: agentIdentity } : null,
    },
  }),
}));

beforeEach(() => {
  fakeRoom = createFakeRoom();
  agentIdentity = 'agent-1';
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useGolfScorecard', () => {
  it('latest wins: two stream messages in sequence replace state with the second', async () => {
    agentIdentity = undefined; // no RPC in flight to worry about
    const { result } = renderHook(() => useGolfScorecard());

    await act(async () => {
      await fakeRoom.__emitStream('golf.scorecard', {
        readAll: async () => JSON.stringify(NINE_HOLES_FROM_TEN),
      });
    });
    expect(result.current.scorecard).toEqual(NINE_HOLES_FROM_TEN);

    await act(async () => {
      await fakeRoom.__emitStream('golf.scorecard', {
        readAll: async () => JSON.stringify(EIGHTEEN_HOLES_MIXED),
      });
    });
    expect(result.current.scorecard).toEqual(EIGHTEEN_HOLES_MIXED);
  });

  it('ignores malformed stream messages (invalid JSON, wrong version) and keeps prior state', async () => {
    agentIdentity = undefined;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useGolfScorecard());

    await act(async () => {
      await fakeRoom.__emitStream('golf.scorecard', {
        readAll: async () => JSON.stringify(NINE_HOLES_FROM_TEN),
      });
    });
    expect(result.current.scorecard).toEqual(NINE_HOLES_FROM_TEN);

    await act(async () => {
      await fakeRoom.__emitStream('golf.scorecard', {
        readAll: async () => '{not json',
      });
    });
    expect(result.current.scorecard).toEqual(NINE_HOLES_FROM_TEN);

    await act(async () => {
      await fakeRoom.__emitStream('golf.scorecard', {
        readAll: async () => JSON.stringify({ ...NINE_HOLES_FROM_TEN, version: 2 }),
      });
    });
    expect(result.current.scorecard).toEqual(NINE_HOLES_FROM_TEN);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('populates state from the initial catch-up RPC and clears isLoading', async () => {
    fakeRoom.localParticipant.performRpc.mockResolvedValueOnce(
      JSON.stringify(EIGHTEEN_HOLES_MIXED)
    );
    const { result } = renderHook(() => useGolfScorecard());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.scorecard).toEqual(EIGHTEEN_HOLES_MIXED);
    expect(result.current.isLoading).toBe(false);
    expect(fakeRoom.localParticipant.performRpc).toHaveBeenCalledWith({
      destinationIdentity: 'agent-1',
      method: 'golf.get_scorecard',
      payload: '',
    });
  });

  it('an RPC "null" response sets isLoading false without setting a scorecard', async () => {
    fakeRoom.localParticipant.performRpc.mockResolvedValueOnce('null');
    const { result } = renderHook(() => useGolfScorecard());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.scorecard).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('a stream message that arrives while the RPC is in flight wins over the RPC result', async () => {
    let resolveRpc: (value: string) => void;
    fakeRoom.localParticipant.performRpc.mockReturnValueOnce(
      new Promise<string>((resolve) => {
        resolveRpc = resolve;
      })
    );
    const { result } = renderHook(() => useGolfScorecard());

    await act(async () => {
      await fakeRoom.__emitStream('golf.scorecard', {
        readAll: async () => JSON.stringify(NINE_HOLES_FROM_TEN),
      });
    });
    expect(result.current.scorecard).toEqual(NINE_HOLES_FROM_TEN);

    await act(async () => {
      resolveRpc(JSON.stringify(EIGHTEEN_HOLES_MIXED));
      await Promise.resolve();
      await Promise.resolve();
    });

    // The stream message is newer than the (now-resolved) RPC call, so it must win.
    expect(result.current.scorecard).toEqual(NINE_HOLES_FROM_TEN);
    expect(result.current.isLoading).toBe(false);
  });

  it('retries the catch-up RPC with backoff after failures, then succeeds', async () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fakeRoom.localParticipant.performRpc
      .mockRejectedValueOnce(new Error('agent not joined yet'))
      .mockRejectedValueOnce(new Error('method not registered yet'))
      .mockResolvedValueOnce(JSON.stringify(NINE_HOLES_FROM_TEN));

    const { result } = renderHook(() => useGolfScorecard());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fakeRoom.localParticipant.performRpc).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(fakeRoom.localParticipant.performRpc).toHaveBeenCalledTimes(2);
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fakeRoom.localParticipant.performRpc).toHaveBeenCalledTimes(3);
    expect(result.current.scorecard).toEqual(NINE_HOLES_FROM_TEN);
    expect(result.current.isLoading).toBe(false);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('gives up after 5 failed attempts and clears isLoading', async () => {
    vi.useFakeTimers();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    fakeRoom.localParticipant.performRpc.mockRejectedValue(new Error('timeout'));

    const { result } = renderHook(() => useGolfScorecard());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    for (const delay of [500, 1000, 2000, 4000]) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(delay);
      });
    }

    expect(fakeRoom.localParticipant.performRpc).toHaveBeenCalledTimes(5);
    expect(result.current.scorecard).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('triggers a new catch-up RPC on RoomEvent.Reconnected', async () => {
    fakeRoom.localParticipant.performRpc.mockResolvedValue(JSON.stringify(NINE_HOLES_FROM_TEN));
    renderHook(() => useGolfScorecard());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fakeRoom.localParticipant.performRpc).toHaveBeenCalledTimes(1);
    expect(fakeRoom.on).toHaveBeenCalledWith(RoomEvent.Reconnected, expect.any(Function));

    await act(async () => {
      fakeRoom.__emit(RoomEvent.Reconnected);
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fakeRoom.localParticipant.performRpc).toHaveBeenCalledTimes(2);
  });

  it('unregisters the stream handler and the reconnected listener on unmount', async () => {
    fakeRoom.localParticipant.performRpc.mockResolvedValue(JSON.stringify(NINE_HOLES_FROM_TEN));
    const { unmount } = renderHook(() => useGolfScorecard());

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    const reconnectedHandler = fakeRoom.on.mock.calls.find(
      ([event]) => event === RoomEvent.Reconnected
    )?.[1];

    unmount();

    expect(fakeRoom.unregisterTextStreamHandler).toHaveBeenCalledWith('golf.scorecard');
    expect(fakeRoom.off).toHaveBeenCalledWith(RoomEvent.Reconnected, reconnectedHandler);
  });
});
