/**
 * F93 — the no-flash theme bootstrap, inlined into the root layout's <head> so it runs before first
 * paint (ahead of React). It resolves the stored mode exactly like the design system's
 * ThemeProvider (`localStorage['heistmind-theme']`, else the default; `system` follows
 * `prefers-color-scheme`) and puts `light`/`dark` on <html>. Without it every page painted in the
 * `:root` (dark) palette until ThemeProvider's effect ran — a dark flash for light-theme users.
 *
 * Kept as a plain string builder (no React, no `@heist-mind/ui` import) so the server-component
 * layout can use it. Keep the storage key + default in sync with `<ThemeProvider>` in providers.tsx.
 */
export function themeInitScript(
  storageKey = 'heistmind-theme',
  defaultMode: 'light' | 'dark' | 'system' = 'dark'
): string {
  const key = JSON.stringify(storageKey);
  const fallback = JSON.stringify(defaultMode);
  return (
    `(function(){var d=document.documentElement,m=${fallback};` +
    `try{var s=localStorage.getItem(${key});if(s==='light'||s==='dark'||s==='system')m=s;}catch(e){}` +
    "var r=m==='system'?(window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):m;" +
    "d.classList.remove('light','dark');d.classList.add(r);})();"
  );
}
