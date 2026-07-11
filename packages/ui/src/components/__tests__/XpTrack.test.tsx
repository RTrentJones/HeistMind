/**
 * @vitest-environment jsdom
 */

import { render, screen } from '../../lib/test-utils';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { XpTrack } from '../XpTrack';

describe('XpTrack', () => {
  it('renders one accessible box per slot with the fill count', () => {
    render(<XpTrack label='Playbook' current={3} size={8} interactive onChange={() => {}} />);
    expect(screen.getAllByRole('button')).toHaveLength(8);
    expect(screen.getByText('3/8')).toBeInTheDocument();
    // Filled boxes read as pressed; empty ones don't; the top filled box names the unmark.
    expect(screen.getByRole('button', { name: 'Mark 1 XP' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Mark 8 XP' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Unmark — back to 2 XP' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('clicking a box sets the track to that box; the top filled box unmarks', async () => {
    const onChange = vi.fn();
    render(<XpTrack current={3} size={8} interactive onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Mark 5 XP' }));
    expect(onChange).toHaveBeenCalledWith(5);
    // The 3rd box is the top filled one — clicking it steps back to 2 (its name says so).
    await userEvent.click(screen.getByRole('button', { name: 'Unmark — back to 2 XP' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('shows the ready badge and the action only when full', () => {
    const { rerender } = render(
      <XpTrack
        current={7}
        size={8}
        readyLabel='Full — ready to advance'
        action={<button>Take advance</button>}
      />
    );
    expect(screen.queryByText('Full — ready to advance')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Take advance' })).not.toBeInTheDocument();

    rerender(
      <XpTrack
        current={8}
        size={8}
        readyLabel='Full — ready to advance'
        action={<button>Take advance</button>}
      />
    );
    expect(screen.getByText('Full — ready to advance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take advance' })).toBeInTheDocument();
  });

  it('non-interactive and disabled tracks refuse clicks', async () => {
    const onChange = vi.fn();
    const { rerender } = render(<XpTrack current={2} size={6} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Mark 4 XP' })).toBeDisabled();

    rerender(<XpTrack current={2} size={6} interactive disabled onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Mark 4 XP' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Mark 4 XP' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses the custom markLabel for accessible names', () => {
    render(
      <XpTrack
        current={0}
        size={8}
        interactive
        onChange={() => {}}
        markLabel={v => `Set crew XP to ${v}`}
      />
    );
    expect(screen.getByRole('button', { name: 'Set crew XP to 8' })).toBeInTheDocument();
  });
});
