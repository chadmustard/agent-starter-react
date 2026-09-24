import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NINE_HOLES_FROM_TEN } from '@/lib/golf/fixtures';
import { GolfSessionView } from './golf-session-view';

const { useGolfScorecardMock } = vi.hoisted(() => ({
  useGolfScorecardMock: vi.fn(),
}));

vi.mock('@/hooks/useGolfScorecard', () => ({
  useGolfScorecard: useGolfScorecardMock,
}));

vi.mock('@/components/agents-ui/blocks/agent-session-view-01', () => ({
  AgentSessionView_01: () => <section data-testid="agent-session-view" />,
}));

describe('GolfSessionView', () => {
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
});
