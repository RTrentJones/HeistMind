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

  it('reserveWidth keeps both labels laid out (inactive one hidden from AT) so arming never resizes', () => {
    render(
      <ConfirmButton
        confirmLabel='Delete for good'
        confirmAriaLabel='Delete “The Job” for good'
        reserveWidth
        variant='danger-outline'
        onConfirm={vi.fn()}
      >
        Delete campaign
      </ConfirmButton>
    );
    const button = screen.getByRole('button', { name: 'Delete campaign' });
    const ghost = button.querySelector('[aria-hidden="true"]');
    expect(ghost).toHaveTextContent('Delete for good');
    expect(ghost).toHaveClass('invisible');
    // F99 — a wrapped reserve label must not push the visible one to the top of the box.
    expect(ghost?.parentElement).toHaveClass('place-items-center');

    fireEvent.click(button);
    const armed = screen.getByRole('button', { name: 'Delete “The Job” for good' });
    expect(armed).toHaveAttribute('data-armed', 'true');
    expect(armed.querySelector('[aria-hidden="true"]')).toHaveTextContent('Delete campaign');
  });
});
