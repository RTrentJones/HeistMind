import { renderOgImage } from '@/lib/og-image';
import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/site';

// twitter:image — the same card as og:image (summary_large_image is set in the root metadata).
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function TwitterImage() {
  return renderOgImage();
}
