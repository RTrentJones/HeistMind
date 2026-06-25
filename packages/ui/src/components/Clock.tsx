import * as React from 'react';
import { cn } from '../lib/utils';

export interface ClockProps {
  /** Total segments (FitD: 4 / 6 / 8 / 10 / 12). */
  segments: number;
  /** How many segments are filled (clamped to [0, segments] for display). */
  filled: number;
  /** Pixel diameter of the ring. */
  size?: number;
  /** Optional caption rendered under the ring (shown with the `filled/segments` count). */
  label?: string;
  className?: string;
}

function polar(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const a = ((angleDeg - 90) * Math.PI) / 180; // 0° points up (12 o'clock)
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

function wedgePath(cx: number, cy: number, r: number, start: number, end: number): string {
  const p1 = polar(cx, cy, r, start);
  const p2 = polar(cx, cy, r, end);
  const largeArc = end - start <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y} Z`;
}

/**
 * A FitD progress clock: a ring divided into `segments` wedges, the first `filled` of which are
 * lit. Presentation only — ticking is driven by the surrounding panel. SVG, so it scales cleanly.
 */
export const Clock: React.FC<ClockProps> = ({ segments, filled, size = 72, label, className }) => {
  const count = Math.max(1, Math.floor(segments));
  const lit = Math.max(0, Math.min(Math.floor(filled), count));
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 2;
  const per = 360 / count;

  return (
    <div className={cn('inline-flex flex-col items-center gap-1', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role='img'
        aria-label={`${label ? `${label}: ` : ''}${lit} of ${count} segments filled`}
      >
        {Array.from({ length: count }, (_, i) => (
          <path
            key={i}
            d={wedgePath(cx, cy, r, i * per, (i + 1) * per)}
            className={i < lit ? 'fill-game-ember' : 'fill-background-secondary'}
            stroke='var(--color-border-primary)'
            strokeWidth={1.5}
          />
        ))}
      </svg>
      {label && (
        <span className='text-xs text-foreground-muted'>
          {label} {lit}/{count}
        </span>
      )}
    </div>
  );
};
