import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  EIGHTEEN_HOLES_COMPLETE,
  EIGHTEEN_HOLES_MIXED,
  NINE_HOLES_FROM_TEN,
  SETUP_EMPTY,
} from '@/lib/golf/fixtures';
import { formatScorecardText, formatToPar } from '@/lib/golf/scorecard';
import { ScorecardPanel } from './scorecard-panel';

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

describe('ScorecardPanel', () => {
  it('renders the setup placeholder with no table and the attribution link', () => {
    const { container } = render(<ScorecardPanel scorecard={SETUP_EMPTY} />);

    expect(screen.getByText('Tell your caddie which course you played')).toBeInTheDocument();
    expect(screen.getByText('Setting up')).toBeInTheDocument();
    expect(container.querySelector('table')).not.toBeInTheDocument();

    const link = screen.getByRole('link', {
      name: 'Course data © OpenStreetMap contributors (ODbL 1.0) via OpenGolfAPI',
    });
    expect(link).toHaveAttribute('href', 'https://opengolfapi.org/attribution');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders a 9-hole in-progress round with the hole grid and stats', () => {
    const { container } = render(<ScorecardPanel scorecard={NINE_HOLES_FROM_TEN} />);

    expect(screen.getByText('Presidio Golf Course')).toBeInTheDocument();
    expect(container.textContent).toContain('9 holes');
    expect(screen.getByText('In progress')).toBeInTheDocument();
    expect(container.querySelector('table')).toBeInTheDocument();

    // Putts stat: total_putts is 9.
    expect(screen.getByTestId('stat-putts').textContent).toContain('9');
    // Fairways stat: fairways_hit/fairways_possible is 3/4.
    expect(screen.getByTestId('stat-fairways').textContent).toContain('3/4');
  });

  it('renders an 18-hole in-progress round with rating/slope and the correct to-par string', () => {
    const { container } = render(<ScorecardPanel scorecard={EIGHTEEN_HOLES_MIXED} />);

    expect(container.textContent).toContain('18 holes');
    expect(container.textContent).toContain('Rating 71.9 / Slope 133');

    const toPar = formatToPar(EIGHTEEN_HOLES_MIXED.summary!.score_to_par);
    expect(container.textContent).toContain(toPar);
  });

  it('shows the round-complete banner and copies the scorecard text on click', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    render(<ScorecardPanel scorecard={EIGHTEEN_HOLES_COMPLETE} />);

    expect(screen.getByText('Round complete')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /copy scorecard/i }));

    expect(writeText).toHaveBeenCalledWith(formatScorecardText(EIGHTEEN_HOLES_COMPLETE));
    expect(toastSuccess).toHaveBeenCalledWith('Scorecard copied');
  });
});
