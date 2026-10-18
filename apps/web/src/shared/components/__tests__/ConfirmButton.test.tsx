import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmButton } from '../ConfirmButton';

function setup() {
  const onConfirm = vi.fn();
  render(
    <ConfirmButton
      aria-label='Remove Alarm'
      confirmAriaLabel='Confirm removing Alarm'
      confirmLabel='Sure?'
      onConfirm={onConfirm}
    >
      Remove
    </ConfirmButton>
  );
  return { onConfirm };
}

describe('ConfirmButton (two-click armed confirm)', () => {
  it('the first click only arms; the second click confirms', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Alarm' }));
    expect(onConfirm).not.toHaveBeenCalled();
    const armed = screen.getByRole('button', { name: 'Confirm removing Alarm' });
    expect(armed).toHaveTextContent('Sure?');
    fireEvent.click(armed);
    expect(onConfirm).toHaveBeenCalledOnce();
    // Back to the unarmed state after firing.
    expect(screen.getByRole('button', { name: 'Remove Alarm' })).toHaveTextContent('Remove');
  });

  it('disarms on blur and on Escape', () => {
    const { onConfirm } = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Remove Alarm' }));
    fireEvent.blur(screen.getByRole('button', { name: 'Confirm removing Alarm' }));
    expect(screen.getByRole('button', { name: 'Remove Alarm' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove Alarm' }));
    fireEvent.keyDown(screen.getByRole('button', { name: 'Confirm removing Alarm' }), {
      key: 'Escape',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove Alarm' }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
