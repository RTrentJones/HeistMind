/**
 * @vitest-environment jsdom
 */

import { render, screen } from '../../lib/test-utils';
import { Select } from '../Select';

describe('Select', () => {
  it('associates the visible label with the control', () => {
    render(
      <Select label='Position' defaultValue='risky'>
        <option value='controlled'>Controlled</option>
        <option value='risky'>Risky</option>
      </Select>
    );
    const control = screen.getByLabelText('Position');
    expect(control.tagName).toBe('SELECT');
    expect(control).toHaveValue('risky');
  });

  it('falls back to an aria-label when the label is hidden', () => {
    render(
      <Select label='Attribute' hideLabel defaultValue='prowess'>
        <option value='insight'>Insight</option>
        <option value='prowess'>Prowess</option>
      </Select>
    );
    // No visible label text, but the control is still accessibly named.
    expect(screen.queryByText('Attribute')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Attribute')).toHaveAttribute('aria-label', 'Attribute');
  });

  it('shows the error message and flips to the error state', () => {
    render(
      <Select label='Effect' error='Pick an effect level.'>
        <option value=''>—</option>
      </Select>
    );
    expect(screen.getByText('Pick an effect level.')).toBeInTheDocument();
    expect(screen.getByLabelText('Effect')).toHaveAttribute('aria-invalid', 'true');
  });

  it('renders bare (no wrapper label) when only an aria-label is supplied', () => {
    render(
      <Select aria-label='Faction status'>
        <option value='0'>Neutral</option>
      </Select>
    );
    expect(screen.getByLabelText('Faction status')).toBeInTheDocument();
    expect(screen.queryByText('Faction status')).not.toBeInTheDocument();
  });

  // F102 — a native select sizes to its longest option; capped, it can't widen its container
  // (the BitD wizard's contact pickers pushed a 360px phone page to 438px).
  it('never grows past its container: capped, shrinkable, truncating — wrapper included', () => {
    render(
      <Select label='Close friend' wrapperClassName='w-full' className='w-full'>
        <option value=''>None</option>
        <option value='a'>A pet hound or hawk — Loyal, and a useful set of senses.</option>
      </Select>
    );
    const control = screen.getByLabelText('Close friend');
    expect(control).toHaveClass('max-w-full', 'min-w-0', 'truncate', 'w-full');
    expect(control.parentElement).toHaveClass('max-w-full', 'min-w-0', 'w-full');
  });
});
