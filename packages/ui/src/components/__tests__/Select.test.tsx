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
});
