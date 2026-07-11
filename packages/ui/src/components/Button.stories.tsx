import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Sword, Shield, Eye, Zap } from 'lucide-react';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A modern, accessible button component with sophisticated styling and Framer Motion animations. Features game-themed variants perfect for HeistMind.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
        'ember',
        'steel',
        'shadow',
        'crimson',
        'glass',
        'neon',
      ],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'xl', 'icon', 'icon-sm', 'icon-lg'],
    },
    loading: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Execute Heist',
  },
};

export const Variants: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Button variant='default'>Default</Button>
      <Button variant='destructive'>Destructive</Button>
      <Button variant='outline'>Outline</Button>
      <Button variant='secondary'>Secondary</Button>
      <Button variant='ghost'>Ghost</Button>
      <Button variant='link'>Link</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Standard button variants that adapt to the current theme. Switch themes using the toolbar to see how they change.',
      },
    },
  },
};

export const GameThemed: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Button variant='ember'>
        <Sword className='w-4 h-4' />
        Ember
      </Button>
      <Button variant='steel'>
        <Shield className='w-4 h-4' />
        Steel
      </Button>
      <Button variant='shadow'>
        <Eye className='w-4 h-4' />
        Shadow
      </Button>
      <Button variant='crimson'>
        <Zap className='w-4 h-4' />
        Crimson
      </Button>
      <Button variant='glass'>Glass</Button>
      <Button variant='neon'>Neon</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Game-themed button variants designed for HeistMind. These maintain their distinctive character across different themes.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <div className='flex items-center gap-4 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Button size='sm'>Small</Button>
      <Button size='default'>Default</Button>
      <Button size='lg'>Large</Button>
      <Button size='xl'>Extra Large</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Button>
        <Sword className='w-4 h-4' />
        Start Heist
      </Button>
      <Button variant='outline'>
        Plan Score
        <Eye className='w-4 h-4' />
      </Button>
      <Button variant='ember'>
        <Shield className='w-4 h-4' />
        Defend
        <Sword className='w-4 h-4' />
      </Button>
    </div>
  ),
};

export const IconButtons: Story = {
  render: () => (
    <div className='flex gap-4 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      {/* Icon-only buttons NEED an aria-label — the icon alone has no accessible name. */}
      <Button size='icon-sm' variant='ghost' aria-label='Reveal'>
        <Eye className='w-4 h-4' />
      </Button>
      <Button size='icon' variant='outline' aria-label='Attack'>
        <Sword className='w-4 h-4' />
      </Button>
      <Button size='icon-lg' variant='ember' aria-label='Defend'>
        <Shield className='w-4 h-4' />
      </Button>
    </div>
  ),
};

export const LoadingStates: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Button loading>Loading...</Button>
      <Button loading loadingText='Rolling dice...' variant='ember'>
        Roll Dice
      </Button>
      <Button loading variant='glass'>
        Processing...
      </Button>
    </div>
  ),
};

export const DisabledStates: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Button disabled>Disabled</Button>
      <Button disabled variant='ember'>
        Disabled Ember
      </Button>
      <Button disabled variant='outline'>
        Disabled Outline
      </Button>
    </div>
  ),
};

export const Interactive: Story = {
  args: {
    children: 'Hover & Click Me',
    variant: 'neon',
    size: 'lg',
  },
  parameters: {
    docs: {
      description: {
        story: 'This button demonstrates the interactive hover and click animations.',
      },
    },
  },
};

export const ThemeAwareness: Story = {
  render: () => (
    <div className='space-y-6 p-6 bg-background-secondary'>
      <div className='space-y-3'>
        <h3 className='text-lg font-semibold text-foreground-primary'>Buttons in Current Theme</h3>
        <p className='text-sm text-foreground-secondary'>
          Use the theme toggle in the Storybook toolbar to see how buttons adapt
        </p>
      </div>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
        <Button variant='default'>Default</Button>
        <Button variant='outline'>Outline</Button>
        <Button variant='ghost'>Ghost</Button>
        <Button variant='secondary'>Secondary</Button>
        <Button variant='ember'>Ember</Button>
        <Button variant='steel'>Steel</Button>
        <Button variant='glass'>Glass</Button>
        <Button variant='neon'>Neon</Button>
      </div>

      <div className='p-4 bg-background-elevated rounded-lg border border-border-secondary'>
        <p className='text-sm text-foreground-muted'>
          Background adapts: bg-background-elevated with border-border-secondary
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates how buttons and backgrounds adapt to theme changes. The layout uses theme-aware CSS custom properties that automatically update when the theme changes.',
      },
    },
  },
};
