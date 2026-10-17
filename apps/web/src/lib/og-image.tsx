/* eslint-disable i18next/no-literal-string -- the social card is a rendered PNG baked at build
   time (crawlers/unfurlers don't send a locale); English, like the root metadata copy. */
import { ImageResponse } from 'next/og';
import { OG_SIZE } from '@/lib/site';

/**
 * The link-preview card (Discord / Slack / X unfurls) shared by app/opengraph-image.tsx and
 * app/twitter-image.tsx. Rendered at build time by next/og (satori) with its bundled font, so it
 * needs no network. Colors are the design system's FitD palette tokens (packages/ui theme.css:
 * --color-game-ember / -crimson / -gold), as hex because satori doesn't parse every CSS color
 * syntax, on the app's noir background (the #0B0F19 theme color).
 */
const NOIR = '#0B0F19';
const EMBER = '#FF4A11'; // hsl(14.3 100% 53.3%)
const CRIMSON = '#E11D48'; // hsl(346.8 77.2% 49.8%)
const GOLD = '#EAB308'; // hsl(45.4 93.4% 47.5%)
const MUTED = '#A3A9B8';

/** A 4-segment progress clock with 2 segments filled — the FitD visual shorthand. */
function Clock() {
  const segment = (filled: boolean) => (
    <div
      style={{ display: 'flex', width: 25, height: 25, background: filled ? EMBER : 'transparent' }}
    />
  );
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 4,
        width: 66,
        height: 66,
        padding: 2,
        borderRadius: 33,
        border: `4px solid ${GOLD}`,
        overflow: 'hidden',
        background: NOIR,
      }}
    >
      {segment(false)}
      {segment(true)}
      {segment(false)}
      {segment(true)}
    </div>
  );
}

export function renderOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 72px',
          backgroundColor: NOIR,
          backgroundImage:
            'radial-gradient(circle at 85% 15%, rgba(255,74,17,0.28), transparent 45%), radial-gradient(circle at 10% 100%, rgba(225,29,72,0.22), transparent 50%)',
          color: '#F5F5F4',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Clock />
          <div
            style={{
              display: 'flex',
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: 6,
              color: GOLD,
            }}
          >
            HEISTMIND
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.1,
              maxWidth: 1000,
            }}
          >
            The mechanical home for your Forged-in-the-Dark crew
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: MUTED, maxWidth: 1000 }}>
            Rules-valid character &amp; crew sheets for any table — and the dice, clocks, and
            campaign log for play-by-post on Discord.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div
            style={{
              display: 'flex',
              width: 220,
              height: 8,
              borderRadius: 4,
              background: `linear-gradient(90deg, ${EMBER}, ${CRIMSON})`,
            }}
          />
          <div style={{ display: 'flex', fontSize: 26, color: MUTED }}>
            Blades in the Dark · Forged in the Dark
          </div>
        </div>
      </div>
    ),
    OG_SIZE
  );
}
