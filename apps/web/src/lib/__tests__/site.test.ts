import { describe, expect, it } from 'vitest';
import { resolveSiteUrl } from '../site';

// The one answer to "what is this deployment's public URL?" — metadata, robots, the sitemap and
// the Discord bot's links (F101) all read it, so a deployment must never resolve to localhost.
describe('resolveSiteUrl', () => {
  it('prefers the explicit SITE_URL (Terraform sets it per Vercel target), trailing slash trimmed', () => {
    expect(
      resolveSiteUrl({
        siteUrl: 'https://beta.heistmind.rtrentjones.dev/',
        deployEnv: 'preview',
        vercelUrl: 'heist-mind-abc.vercel.app',
      })
    ).toBe('https://beta.heistmind.rtrentjones.dev');
  });

  it('falls back to the canonical origin on production', () => {
    expect(
      resolveSiteUrl({ deployEnv: 'production', vercelUrl: 'heist-mind-abc.vercel.app' })
    ).toBe('https://www.heistmind.com');
  });

  it("falls back to this deployment's Vercel URL on a preview", () => {
    expect(resolveSiteUrl({ deployEnv: 'preview', vercelUrl: 'heist-mind-abc.vercel.app' })).toBe(
      'https://heist-mind-abc.vercel.app'
    );
  });

  it('is localhost only for local dev (no Vercel env at all)', () => {
    expect(resolveSiteUrl({ deployEnv: 'development' })).toBe('http://localhost:3000');
    expect(resolveSiteUrl({ deployEnv: 'development', port: '4000' })).toBe(
      'http://localhost:4000'
    );
  });
});
