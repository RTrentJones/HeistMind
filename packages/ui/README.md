# @heist-mind/ui

A shared UI component library and design system for HeistMind applications.

## Installation

```bash
pnpm add @heist-mind/ui
```

## Usage

### Basic Components

```tsx
import { Button, Card, Input, Badge } from '@heist-mind/ui';
import '@heist-mind/ui/styles';

function App() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <Input placeholder='Enter your name' />
        <Button variant='primary'>Submit</Button>
        <Badge variant='success'>Active</Badge>
      </CardContent>
    </Card>
  );
}
```

### Game Components

```tsx
import { ActionDots, StressTracker } from '@heist-mind/ui';

function GameInterface() {
  return (
    <div>
      <ActionDots
        name='Prowl'
        value={3}
        max={4}
        onChange={value => console.log('New value:', value)}
      />
      <StressTracker current={2} max={9} onChange={value => console.log('Stress:', value)} />
    </div>
  );
}
```

### Layout Components

```tsx
import { Container } from '@heist-mind/ui';

function Layout({ children }) {
  return <Container size='lg'>{children}</Container>;
}
```

### Design Tokens

```tsx
import { colors, typography, spacing } from '@heist-mind/ui';

// Access design tokens programmatically
const primaryColor = colors.primary[600];
```

### Tailwind Configuration

If you're using Tailwind CSS, you can extend your configuration with the UI package's tokens:

```js
// tailwind.config.js
module.exports = {
  presets: [require('@heist-mind/ui/tailwind')],
  content: [
    // your content paths
    './node_modules/@heist-mind/ui/dist/**/*.{js,ts,jsx,tsx}',
  ],
  // your config
};
```

## Components

- **Button** - Versatile button component with multiple variants
- **Card** - Container component with header, content, and title sections
- **Input** - Form input component
- **Badge** - Status indicator component
- **Container** - Layout container with responsive sizing
- **ActionDots** - Game-specific action rating component
- **StressTracker** - Game-specific stress tracking component

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Watch for changes
pnpm dev

# Type check
pnpm type-check
```

## Design System

This package follows the HeistMind design system with:

- Consistent color palette
- Typography scale
- Spacing system
- Component variants
- Dark theme support

## License

MIT
