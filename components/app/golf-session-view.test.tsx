import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NINE_HOLES_FROM_TEN } from '@/lib/golf/fixtures';
import { GolfSessionView } from './golf-session-view';

const { useGolfScorecardMock, agentSessionViewMock } = vi.hoisted(() => ({
  useGolfScorecardMock: vi.fn(),
  agentSessionViewMock: vi.fn(),
}));

vi.mock('@/hooks/useGolfScorecard', () => ({
  useGolfScorecard: useGolfScorecardMock,
}));

vi.mock('@/components/agents-ui/blocks/agent-session-view-01', () => ({
  AgentSessionView_01: (props: Record<string, unknown>) => {
    agentSessionViewMock(props);
    return <section data-testid="agent-session-view" />;
  },
}));

describe('GolfSessionView', () => {
  beforeEach(() => {
    agentSessionViewMock.mockClear();
  });

  it('does not render the scorecard aside before the first payload', () => {
    useGolfScorecardMock.mockReturnValue({ scorecard: null, isLoading: true });

    render(<GolfSessionView />);

    expect(screen.getByTestId('agent-session-view')).toBeInTheDocument();
    expect(screen.queryByRole('complementary', { name: 'Scorecard' })).not.toBeInTheDocument();
  });

  it('renders the scorecard aside once a scorecard is available', () => {
    useGolfScorecardMock.mockReturnValue({ scorecard: NINE_HOLES_FROM_TEN, isLoading: false });

    render(<GolfSessionView />);

    expect(screen.getByTestId('agent-session-view')).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Scorecard' })).toBeInTheDocument();
    expect(screen.getByText('Presidio Golf Course')).toBeInTheDocument();
  });

  it('applies a `style` prop (as injected by motion.create) to the outer section, not to AgentSessionView_01', () => {
    useGolfScorecardMock.mockReturnValue({ scorecard: null, isLoading: true });

    const { container } = render(<GolfSessionView style={{ opacity: 0 }} />);

    const outer = container.querySelector('section[style]');
    expect(outer).not.toBeNull();
    expect(outer).toHaveStyle({ opacity: '0' });

    expect(agentSessionViewMock).toHaveBeenCalledTimes(1);
    const forwardedProps = agentSessionViewMock.mock.calls[0][0];
    expect(forwardedProps).not.toHaveProperty('style');
    expect(forwardedProps).not.toHaveProperty('className');
    expect(forwardedProps).not.toHaveProperty('ref');
  });
});
