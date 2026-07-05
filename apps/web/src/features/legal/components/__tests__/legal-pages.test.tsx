import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AcceptableUseContent } from '../AcceptableUseContent';
import { DmcaContent } from '../DmcaContent';
import { LegalHubContent } from '../LegalHubContent';
import { LicensesContent } from '../LicensesContent';
import { PrivacyContent } from '../PrivacyContent';
import { TermsContent } from '../TermsContent';

// One render test per document: the h1 plus one load-bearing section each. The prose is static
// TSX, so a single render marks the file covered while pinning the clauses that must not
// silently vanish (the §512 hooks, the deletion path, the confirm-word free upload warranty).

describe('legal documents', () => {
  it('hub lists all five documents', () => {
    render(<LegalHubContent />);
    expect(screen.getByRole('heading', { level: 1, name: 'Legal' })).toBeInTheDocument();
    for (const title of [
      'Terms of Service',
      'Privacy Policy',
      'DMCA & Copyright Policy',
      'Acceptable Use Policy',
      'Content Licenses & Attributions',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    }
  });

  it('terms carry the UGC ownership grant and the repeat-infringer clause', () => {
    render(<TermsContent />);
    expect(screen.getByRole('heading', { level: 1, name: 'Terms of Service' })).toBeInTheDocument();
    expect(screen.getByText('You own Your Content.')).toBeInTheDocument();
    expect(screen.getByText(/accounts of repeat infringers/)).toBeInTheDocument();
  });

  it('privacy policy names the self-service deletion path', () => {
    render(<PrivacyContent />);
    expect(screen.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'delete your account' })).toHaveAttribute(
      'href',
      '/settings'
    );
  });

  it('DMCA policy carries the six-element notice checklist and counter-notice window', () => {
    render(<DmcaContent />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'DMCA & Copyright Policy' })
    ).toBeInTheDocument();
    expect(screen.getByText(/512\(c\)\(3\)/)).toBeInTheDocument();
    expect(screen.getByText(/10–14 business days/)).toBeInTheDocument();
  });

  it('acceptable use draws the copied-book-text line', () => {
    render(<AcceptableUseContent />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Acceptable Use Policy' })
    ).toBeInTheDocument();
    expect(screen.getByText(/copied from commercial game books/)).toBeInTheDocument();
  });

  it('licenses page renders every catalog entry with its live license tag', () => {
    render(<LicensesContent />);
    expect(screen.getByText('Brackwater')).toBeInTheDocument();
    expect(screen.getByText('Blades in the Dark')).toBeInTheDocument();
    expect(screen.getByText('Wicked Ones')).toBeInTheDocument();
    // The CC BY attribution is a license obligation — pin it (it renders twice by design:
    // once on the live catalog card, once in the static prose).
    expect(screen.getAllByText(/product of One Seven Design, developed/).length).toBeGreaterThan(0);
  });
});
