import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import '@/lib/i18n';
import { RulesetUpload } from '../RulesetUpload';

// The upload gate: JSON alone must not arm the button — the IP attestation checkbox is the
// second condition (the ToS warranty restated at the moment it matters).

function renderUpload() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RulesetUpload />
    </QueryClientProvider>
  );
}

describe('RulesetUpload attestation gate', () => {
  it('keeps Upload disabled until BOTH content and the attestation are present', async () => {
    renderUpload();
    const button = screen.getByRole('button', { name: 'Upload ruleset' });
    const checkbox = screen.getByLabelText(/right to upload this content/i);

    // Empty form: disabled.
    expect(button).toBeDisabled();

    // Content without attestation: still disabled.
    await userEvent.type(screen.getByLabelText('Ruleset JSON', { exact: true }), '{{}');
    expect(button).toBeDisabled();

    // Attestation checked: armed.
    await userEvent.click(checkbox);
    expect(button).toBeEnabled();

    // Unchecking disarms again.
    await userEvent.click(checkbox);
    expect(button).toBeDisabled();
  });

  it('links the Terms, DMCA, and Acceptable Use policies next to the attestation', () => {
    renderUpload();
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
      'href',
      '/legal/terms'
    );
    expect(screen.getByRole('link', { name: 'DMCA policy' })).toHaveAttribute(
      'href',
      '/legal/dmca'
    );
    expect(screen.getByRole('link', { name: 'Acceptable Use Policy' })).toHaveAttribute(
      'href',
      '/legal/acceptable-use'
    );
    // The concrete rule the AUP link anchors: no book text, own words.
    expect(screen.getByText(/own words only/i)).toBeInTheDocument();
  });
});
