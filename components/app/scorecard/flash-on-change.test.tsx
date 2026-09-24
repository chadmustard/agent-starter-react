import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { FlashOnChange } from './flash-on-change';

describe('FlashOnChange', () => {
  it('does not flash on initial mount, even when children are non-null', () => {
    const { container } = render(<FlashOnChange value={4}>4</FlashOnChange>);

    expect(container.querySelector('[data-flash]')).not.toBeInTheDocument();
  });

  it('flashes when value changes after mount', () => {
    const { container, rerender } = render(<FlashOnChange value={4}>4</FlashOnChange>);

    expect(container.querySelector('[data-flash]')).not.toBeInTheDocument();

    rerender(<FlashOnChange value={5}>5</FlashOnChange>);

    expect(container.querySelector('[data-flash="true"]')).toBeInTheDocument();
  });

  it('flashes on a null -> value transition even though the wrapper was already mounted', () => {
    // This is the regression case: a cell that renders `null` while unrecorded must keep
    // `FlashOnChange` mounted so that recording a value is seen as a *change*, not a fresh mount.
    const { container, rerender } = render(<FlashOnChange value={null}>{null}</FlashOnChange>);

    expect(container.querySelector('[data-flash]')).not.toBeInTheDocument();

    rerender(<FlashOnChange value={4}>4</FlashOnChange>);

    expect(container.querySelector('[data-flash="true"]')).toBeInTheDocument();
  });

  it('does not flash when rerendered with the same value', () => {
    const { container, rerender } = render(<FlashOnChange value={4}>4</FlashOnChange>);

    rerender(<FlashOnChange value={4}>4</FlashOnChange>);

    expect(container.querySelector('[data-flash]')).not.toBeInTheDocument();
  });
});
