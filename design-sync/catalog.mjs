// Design-system catalog — the single source of what gets synced to Claude Design.
//
// Each entry becomes ONE preview card in the claude.ai/design Design System pane. The
// node is rendered from the BUILT `@heist-mind/ui` (passed in as `ui`), so a card always
// reflects the real component + its real Tailwind classes — never a hand-drawn mock that
// can drift. `build.mjs` renders each node to self-contained HTML and writes the bundle.
//
// To add a component: import it from `ui` below and add a `{ id, group, title, subtitle,
// node }` entry. Show several variants per card so the render-check doesn't flag it as
// "thin" or "variants identical". `group` is the free-form section label in the pane.
//
// `h` is React.createElement (passed in so this file needs no JSX build step).

export default function buildCatalog(ui, h) {
  const {
    Button,
    Badge,
    Alert,
    AlertTitle,
    AlertDescription,
    Heading,
    Text,
    Paragraph,
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
    CardFooter,
    StatusIcon,
    LoadingSpinner,
    Input,
    Textarea,
    Container,
    Grid,
    Stack,
    Section,
  } = ui;

  // --- layout scaffolding (NOT component styles) -------------------------------------------
  // Inline styles only, so the card stays self-contained and the scaffold never competes with
  // the component's own Tailwind classes.
  const Row = (...kids) =>
    h(
      'div',
      { style: { display: 'flex', flexWrap: 'wrap', gap: '18px', alignItems: 'flex-start' } },
      ...kids
    );
  const Stk = (...kids) =>
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '20px' } }, ...kids);
  const Tag = t =>
    h(
      'div',
      {
        style: {
          font: '600 10px ui-monospace,SFMono-Regular,monospace',
          color: '#9ca3af',
          letterSpacing: '.08em',
          textTransform: 'uppercase',
        },
      },
      t
    );
  const Cell = (label, node) =>
    h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } }, Tag(label), node);
  const Box = t =>
    h(
      'div',
      {
        style: {
          padding: '14px 18px',
          border: '1px dashed #4b5563',
          borderRadius: '10px',
          color: '#cbd5e1',
          font: '500 13px system-ui',
          background: 'rgba(255,255,255,.02)',
        },
      },
      t
    );

  return [
    // ----------------------------------------------------------------------------- Actions
    {
      id: 'button',
      group: 'Actions',
      title: 'Button',
      subtitle: 'default / secondary / outline / ghost / destructive · sizes sm–xl · game variants',
      node: Stk(
        Row(
          Cell('default', h(Button, {}, 'Continue')),
          Cell('secondary', h(Button, { variant: 'secondary' }, 'Secondary')),
          Cell('outline', h(Button, { variant: 'outline' }, 'Outline')),
          Cell('ghost', h(Button, { variant: 'ghost' }, 'Ghost')),
          Cell(
            'destructive',
            h(Button, { variant: 'destructive', 'aria-label': 'Delete' }, 'Delete')
          )
        ),
        Row(
          Cell('sm', h(Button, { size: 'sm' }, 'Small')),
          Cell('default', h(Button, {}, 'Default')),
          Cell('lg', h(Button, { size: 'lg' }, 'Large')),
          Cell('xl', h(Button, { size: 'xl' }, 'Extra large'))
        ),
        Row(
          Cell('ember', h(Button, { variant: 'ember' }, 'Ember')),
          Cell('steel', h(Button, { variant: 'steel' }, 'Steel')),
          Cell('crimson', h(Button, { variant: 'crimson' }, 'Crimson')),
          Cell('glass', h(Button, { variant: 'glass' }, 'Glass')),
          Cell('neon', h(Button, { variant: 'neon' }, 'Neon'))
        )
      ),
    },

    // ------------------------------------------------------------------------- Data display
    {
      id: 'badge',
      group: 'Data display',
      title: 'Badge',
      subtitle: 'default / secondary / destructive / outline / success / warning / info',
      node: Stk(
        Row(
          Cell('default', h(Badge, {}, 'Default')),
          Cell('secondary', h(Badge, { variant: 'secondary' }, 'Secondary')),
          Cell('destructive', h(Badge, { variant: 'destructive' }, 'Destructive')),
          Cell('outline', h(Badge, { variant: 'outline' }, 'Outline'))
        ),
        Row(
          Cell('success', h(Badge, { variant: 'success' }, 'Success')),
          Cell('warning', h(Badge, { variant: 'warning' }, 'Warning')),
          Cell('info', h(Badge, { variant: 'info' }, 'Info'))
        )
      ),
    },
    {
      id: 'card',
      group: 'Data display',
      title: 'Card',
      subtitle: 'default / outline / success · header · content · footer',
      node: Row(
        h(
          Card,
          { style: { width: '280px' } },
          h(
            CardHeader,
            {},
            h(CardTitle, {}, 'Heist briefing'),
            h(CardDescription, {}, 'Three exits, one vault, sixty seconds.')
          ),
          h(Text, { size: 'sm' }, 'The crew is assembled and the timer is primed.'),
          h(CardFooter, { style: { marginTop: '16px' } }, h(Button, { size: 'sm' }, 'Begin'))
        ),
        h(
          Card,
          { variant: 'outline', style: { width: '280px' } },
          h(CardHeader, {}, h(CardTitle, {}, 'Outline')),
          h(Text, { size: 'sm' }, 'A quieter surface for secondary content.')
        ),
        h(
          Card,
          { variant: 'success', style: { width: '280px' } },
          h(CardHeader, {}, h(CardTitle, {}, 'Success')),
          h(Text, { size: 'sm' }, 'Objective complete — loot secured.')
        )
      ),
    },
    {
      id: 'status-icon',
      group: 'Data display',
      title: 'StatusIcon',
      subtitle: 'success / error / warning / info / neutral',
      node: Row(
        Cell('success', h(StatusIcon, { status: 'success' })),
        Cell('error', h(StatusIcon, { status: 'error' })),
        Cell('warning', h(StatusIcon, { status: 'warning' })),
        Cell('info', h(StatusIcon, { status: 'info' })),
        Cell('neutral', h(StatusIcon, { status: 'neutral' }))
      ),
    },

    // ----------------------------------------------------------------------------- Feedback
    {
      id: 'alert',
      group: 'Feedback',
      title: 'Alert',
      subtitle: 'default / info / success / warning / destructive',
      node: Stk(
        h(
          Alert,
          { variant: 'info' },
          h(AlertTitle, {}, 'Heads up'),
          h(AlertDescription, {}, 'The vault timer resets at midnight.')
        ),
        h(
          Alert,
          { variant: 'success' },
          h(AlertTitle, {}, 'Clean getaway'),
          h(AlertDescription, {}, 'Every objective was completed without alarms.')
        ),
        h(
          Alert,
          { variant: 'warning' },
          h(AlertTitle, {}, 'Patrol incoming'),
          h(AlertDescription, {}, 'A guard is two rooms away — move quietly.')
        ),
        h(
          Alert,
          { variant: 'destructive' },
          h(AlertTitle, {}, 'Alarm triggered'),
          h(AlertDescription, {}, 'Lockdown engaged. Find an alternate exit.')
        )
      ),
    },
    {
      id: 'loading-spinner',
      group: 'Feedback',
      title: 'LoadingSpinner',
      subtitle: 'sizes sm–xl',
      node: Row(
        Cell('sm', h(LoadingSpinner, { size: 'sm' })),
        Cell('md', h(LoadingSpinner, { size: 'md' })),
        Cell('lg', h(LoadingSpinner, { size: 'lg' })),
        Cell('xl', h(LoadingSpinner, { size: 'xl' }))
      ),
    },

    // --------------------------------------------------------------------------- Typography
    {
      id: 'heading',
      group: 'Typography',
      title: 'Heading',
      subtitle: 'levels h1–h4 · color variants',
      node: Stk(
        h(Heading, { level: 'h1' }, 'Heading h1'),
        h(Heading, { level: 'h2' }, 'Heading h2'),
        h(Heading, { level: 'h3' }, 'Heading h3'),
        h(Heading, { level: 'h4' }, 'Heading h4'),
        Row(
          h(Heading, { level: 'h4', variant: 'primary' }, 'Primary'),
          h(Heading, { level: 'h4', variant: 'secondary' }, 'Secondary'),
          h(Heading, { level: 'h4', variant: 'success' }, 'Success'),
          h(Heading, { level: 'h4', variant: 'warning' }, 'Warning')
        )
      ),
    },
    {
      id: 'text',
      group: 'Typography',
      title: 'Text',
      subtitle: 'color variants · sizes',
      node: Stk(
        Row(
          h(Text, { variant: 'default' }, 'Default'),
          h(Text, { variant: 'primary' }, 'Primary'),
          h(Text, { variant: 'secondary' }, 'Secondary'),
          h(Text, { variant: 'success' }, 'Success'),
          h(Text, { variant: 'warning' }, 'Warning'),
          h(Text, { variant: 'error' }, 'Error'),
          h(Text, { variant: 'info' }, 'Info')
        ),
        Row(
          h(Text, { size: 'sm' }, 'Small'),
          h(Text, { size: 'base' }, 'Base'),
          h(Text, { size: 'lg' }, 'Large'),
          h(Text, { size: 'xl' }, 'Extra large')
        )
      ),
    },
    {
      id: 'paragraph',
      group: 'Typography',
      title: 'Paragraph',
      subtitle: 'body copy · default / secondary',
      node: Stk(
        h(
          Paragraph,
          {},
          'The crew moved through the gallery like smoke — unseen, unhurried, certain. Every step had been rehearsed a hundred times in the dark.'
        ),
        h(
          Paragraph,
          { variant: 'secondary', size: 'sm' },
          'Secondary, small: supporting copy for captions and asides.'
        )
      ),
    },

    // -------------------------------------------------------------------------------- Forms
    {
      id: 'input',
      group: 'Forms',
      title: 'Input',
      subtitle: 'default / error / success · sizes',
      node: Stk(
        Row(
          Cell('default', h(Input, { placeholder: 'Codename' })),
          Cell('error', h(Input, { placeholder: 'Codename', state: 'error', defaultValue: 'xÿz' })),
          Cell(
            'success',
            h(Input, { placeholder: 'Codename', state: 'success', defaultValue: 'Magpie' })
          )
        ),
        Row(
          Cell('sm', h(Input, { size: 'sm', placeholder: 'Small' })),
          Cell('default', h(Input, { placeholder: 'Default' })),
          Cell('lg', h(Input, { size: 'lg', placeholder: 'Large' }))
        )
      ),
    },
    {
      id: 'textarea',
      group: 'Forms',
      title: 'Textarea',
      subtitle: 'multi-line input',
      node: h(Textarea, {
        placeholder: 'Describe the approach vector…',
        rows: 4,
        style: { width: '360px' },
      }),
    },

    // ------------------------------------------------------------------------------- Layout
    {
      id: 'layout',
      group: 'Layout',
      title: 'Layout primitives',
      subtitle: 'Stack · Grid · Container · Section',
      node: Stk(
        Cell('Stack (vertical rhythm)', h(Stack, {}, Box('First'), Box('Second'), Box('Third'))),
        Cell('Grid', h(Grid, {}, Box('1'), Box('2'), Box('3'), Box('4'), Box('5'), Box('6'))),
        Cell(
          'Container (max-width + centering)',
          h(Container, {}, Box('Centered, width-capped content'))
        ),
        Cell(
          'Section',
          h(
            Section,
            {},
            h(Heading, { level: 'h3' }, 'Section'),
            h(Paragraph, { size: 'sm' }, 'A vertical band of related content.')
          )
        )
      ),
    },
  ];
}
