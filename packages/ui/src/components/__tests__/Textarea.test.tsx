/**
 * @vitest-environment jsdom
 */

import { render, screen } from '../../lib/test-utils';
import { Textarea } from '../Textarea';

describe('Textarea', () => {
  it('associates the label with the control', () => {
    render(<Textarea label='Background' placeholder='Where from?' />);
    const control = screen.getByLabelText('Background');
    expect(control.tagName).toBe('TEXTAREA');
    expect(control).toHaveAttribute('placeholder', 'Where from?');
  });

  it('renders help text and wires it into aria-describedby', () => {
    render(<Textarea label='Description' helpText='Shown on your sheet.' />);
    const control = screen.getByLabelText('Description');
    const help = screen.getByText('Shown on your sheet.');
    expect(control.getAttribute('aria-describedby')).toContain(help.id);
  });

  it('shows an error message as a live alert and marks the field invalid', () => {
    render(<Textarea label='Notes' error='A description is required.' />);
    expect(screen.getByRole('alert')).toHaveTextContent('A description is required.');
    expect(screen.getByLabelText('Notes')).toHaveAttribute('aria-invalid', 'true');
  });

  it('disables resizing when resizable is false', () => {
    render(<Textarea label='Fixed' resizable={false} />);
    expect(screen.getByLabelText('Fixed')).toHaveClass('resize-none');
  });
});
