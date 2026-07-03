'use client';

// The last-resort boundary: catches throws in the ROOT layout itself, where no providers exist —
// it must render its own <html>/<body> and can rely on nothing but the i18n instance.
import { useEffect } from 'react';
import { captureError } from '@heist-mind/telemetry';
import i18n from '@/lib/i18n';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { 'error.digest': error.digest, 'error.surface': 'global' });
  }, [error]);

  return (
    <html lang='en'>
      <body style={{ background: '#0c0a09', color: '#e7e5e4', fontFamily: 'system-ui' }}>
        <div style={{ maxWidth: 480, margin: '20vh auto', padding: 24, textAlign: 'center' }}>
          <h1>{i18n.t('errors:boundary.title')}</h1>
          <p>{i18n.t('errors:boundary.fallback')}</p>
          <button
            type='button'
            onClick={reset}
            style={{
              marginTop: 16,
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid #78716c',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
            }}
          >
            {i18n.t('errors:boundary.tryAgain')}
          </button>
        </div>
      </body>
    </html>
  );
}
