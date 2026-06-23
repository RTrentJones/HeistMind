# HeistMind UI (`@heist-mind/ui`) — how to build with it

A **dark-first** design system for the HeistMind tabletop-RPG app (Blades in the Dark / Forged in the Dark). Radix primitives + Tailwind CSS 4 semantic tokens, with game-themed accents. Components are on `window.HeistMindUi.*` (bundle: `_ds_bundle.js`).

## Wrapping & setup

Wrap your app once in the theme provider; add the tooltip provider if you use `Tooltip`:

```jsx
const { ThemeProvider, TooltipProvider, Button } = window.HeistMindUi;

<ThemeProvider defaultMode='dark'>
  {' '}
  {/* applies the dark|light class + theme tokens to :root */}
  <TooltipProvider>
    {' '}
    {/* only needed if you render <Tooltip> */}
    {/* your screens */}
  </TooltipProvider>
</ThemeProvider>;
```

- `useTheme()` and theme-aware components (e.g. `Header`) read context from `ThemeProvider` — without it they throw. `defaultMode` is `"dark" | "light" | "system"`; this DS is **designed dark** (`:root` defaults to the dark palette; a `.light` class flips it).
- **Ignore `PreviewRuntime`** if you see it in generated snippets — it is a sync/preview-only helper (it freezes animations and paints the page background for screenshots). Do **not** put it in real designs.

## Styling idiom — Tailwind utilities over semantic tokens

Style with Tailwind classes that map to the DS's **semantic color tokens** — never raw hex. Families (real classes; each exists as `bg-`, `text-`, and/or `border-`):

| Family         | Examples                                                                                                                                                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Surfaces       | `bg-background-primary` `bg-background-secondary` `bg-background-tertiary` `bg-background-elevated` `bg-background-glass`                                                                                                |
| Text           | `text-foreground-primary` `text-foreground-secondary` `text-foreground-muted`                                                                                                                                            |
| Borders        | `border-border-primary` `border-border-secondary` `border-border-muted`                                                                                                                                                  |
| Brand (purple) | `bg-brand-primary` `text-brand-primary` `border-brand-accent`                                                                                                                                                            |
| Semantic       | `text-semantic-success` `bg-semantic-error` `border-semantic-warning` `text-semantic-info`                                                                                                                               |
| Game accents   | `text-game-ember` `bg-game-steel` `border-game-crimson` `text-game-gold` `bg-game-shadow`                                                                                                                                |
| Display type   | `font-display` (Cinzel / Playfair Display — dramatic headings) · `font-mono`                                                                                                                                             |
| Decorative     | `glass` · `neu-flat` `neu-inset` `neu-raised` · `shadow-glow-ember` `shadow-glow-steel` `shadow-glow-crimson` `shadow-glow-purple` · `text-gradient` `text-gradient-ember` `text-gradient-steel` `text-gradient-crimson` |

**Prefer component variant props for component styling** — most components carry the design language in their props rather than classes: e.g. `Button`/`Badge`/`Card` take `variant` (`default | destructive | outline | secondary | ghost | link | ember | steel | shadow | crimson | glass | neon`) and `size`. Use the utility classes above for your own layout glue (spacing, grid, the surface a screen sits on). Only the token-utilities compiled into `_ds_bundle.css` are available — read it for the full set; don't invent new Tailwind color utilities.

## Where the truth lives

- **Styling**: `_ds/<folder>/styles.css` → `_ds_bundle.css` — the full token definitions (`--color-*`) and every available utility class. Read it before styling.
- **Per component**: `<Name>.d.ts` is the exact prop contract; `<Name>.prompt.md` shows real composition examples. Read these before using a component.

## Idiomatic example

```jsx
const { Card, Heading, Text, Button, Badge } = window.HeistMindUi;

<div className='bg-background-primary p-8'>
  <Card variant='default' className='max-w-md'>
    <Heading className='font-display'>Plan the Score</Heading>
    <Text className='text-foreground-secondary'>Pick your crew and case the target.</Text>
    <div className='flex items-center gap-3 mt-4'>
      <Badge variant='ember'>Risky</Badge>
      <Button variant='ember'>Start Heist</Button>
    </div>
  </Card>
</div>;
```
