import { renderOgImage } from '@/lib/og-image';
import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE } from '@/lib/site';

// The site-wide link-preview image (og:image). Inherited by every route; generated at build.
export const alt = OG_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function OpenGraphImage() {
  return renderOgImage();
}
