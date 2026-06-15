import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';
import { Crown, Shield, Sword, Zap, Star, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const meta: Meta<typeof Badge> = {
  title: 'Components/Badge',
  component: Badge,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A versatile badge component with game-themed variants, stress indicators, skill levels, and interactive capabilities perfect for HeistMind character sheets and status displays.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'secondary',
        'destructive',
        'outline',
        'glass',
        'ember',
        'steel',
        'shadow',
        'crimson',
        'gold',
        'success',
        'warning',
        'info',
        'novice',
        'trained',
        'expert',
        'master',
        'stress-low',
        'stress-medium',
        'stress-high',
        'stress-critical',
      ],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'xl'],
    },
    interactive: {
      control: 'boolean',
    },
    pulse: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'New',
  },
};

export const Usage: Story = {
  render: () => (
    <div className='space-y-4 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <h3 className='text-lg font-semibold text-foreground-primary'>Correct Usage Examples</h3>
      <div className='space-y-3'>
        <div className='space-y-2'>
          <h4 className='text-sm font-medium text-foreground-secondary'>
            ✅ Correct - Use icon prop
          </h4>
          <div className='flex gap-2'>
            <Badge variant='ember' icon={<Sword className='w-3 h-3' />}>
              Combat Ready
            </Badge>
            <Badge variant='master' icon={<Star className='w-3 h-3' />}>
              Expert Level
            </Badge>
          </div>
        </div>

        <div className='space-y-2'>
          <h4 className='text-sm font-medium text-foreground-secondary'>
            ❌ Incorrect - Don't put icons in children
          </h4>
          <div className='text-xs text-foreground-muted font-mono bg-background-tertiary p-2 rounded border border-border-secondary'>
            {'<Badge variant="ember">'}
            <br />
            {'  <Sword className="w-3 h-3" />'}
            <br />
            {'  Combat Ready'}
            <br />
            {'</Badge>'}
          </div>
          <p className='text-xs text-foreground-muted'>
            This causes vertical stacking instead of inline layout
          </p>
        </div>
      </div>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className='flex flex-wrap gap-3 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Badge variant='default'>Default</Badge>
      <Badge variant='secondary'>Secondary</Badge>
      <Badge variant='destructive'>Destructive</Badge>
      <Badge variant='outline'>Outline</Badge>
      <Badge variant='glass'>Glass</Badge>
    </div>
  ),
};

export const GameThemed: Story = {
  render: () => (
    <div className='flex flex-wrap gap-3 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Badge variant='ember' icon={<Sword className='w-3 h-3' />}>
        Ember
      </Badge>
      <Badge variant='steel' icon={<Shield className='w-3 h-3' />}>
        Steel
      </Badge>
      <Badge variant='shadow'>Shadow</Badge>
      <Badge variant='crimson' icon={<Zap className='w-3 h-3' />}>
        Crimson
      </Badge>
      <Badge variant='gold' icon={<Crown className='w-3 h-3' />}>
        Gold
      </Badge>
    </div>
  ),
};

export const StatusVariants: Story = {
  render: () => (
    <div className='flex flex-wrap gap-3 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Badge variant='success' icon={<CheckCircle className='w-3 h-3' />}>
        Success
      </Badge>
      <Badge variant='warning' icon={<AlertTriangle className='w-3 h-3' />}>
        Warning
      </Badge>
      <Badge variant='info' icon={<Clock className='w-3 h-3' />}>
        Info
      </Badge>
    </div>
  ),
};

export const SkillLevels: Story = {
  render: () => (
    <div className='space-y-4 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <h3 className='text-lg font-semibold text-foreground-primary mb-4'>Skill Progression</h3>
      <div className='flex flex-wrap gap-3'>
        <Badge
          variant='novice'
          size='lg'
          icon={<div className='w-2 h-2 bg-foreground-muted rounded-full' />}
        >
          Novice (0)
        </Badge>
        <Badge
          variant='trained'
          size='lg'
          icon={<div className='w-2 h-2 bg-semantic-info rounded-full' />}
        >
          Trained (1-2)
        </Badge>
        <Badge
          variant='expert'
          size='lg'
          icon={<div className='w-2 h-2 bg-brand-primary rounded-full' />}
        >
          Expert (3-4)
        </Badge>
        <Badge variant='master' size='lg' icon={<Star className='w-3 h-3' />}>
          Master (5+)
        </Badge>
      </div>
    </div>
  ),
};

export const StressIndicators: Story = {
  render: () => (
    <div className='space-y-4 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <h3 className='text-lg font-semibold text-foreground-primary mb-4'>Stress Levels</h3>
      <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
        <Badge variant='stress-low' size='lg'>
          Low (0-2)
        </Badge>
        <Badge variant='stress-medium' size='lg'>
          Medium (3-5)
        </Badge>
        <Badge variant='stress-high' size='lg'>
          High (6-7)
        </Badge>
        <Badge variant='stress-critical' size='lg' pulse>
          Critical (8+)
        </Badge>
      </div>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className='flex flex-wrap gap-3 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Badge variant='ember' icon={<Sword className='w-3 h-3' />}>
        Combat
      </Badge>
      <Badge variant='steel' icon={<Shield className='w-3 h-3' />}>
        Defense
      </Badge>
      <Badge variant='gold' icon={<Crown className='w-3 h-3' />}>
        Leadership
      </Badge>
      <Badge variant='glass' icon={<Zap className='w-3 h-3' />}>
        Arcane
      </Badge>
      <Badge variant='crimson' icon={<Star className='w-3 h-3' />}>
        Special
      </Badge>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className='flex flex-wrap items-center gap-4 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Badge size='sm' variant='ember'>
        Small
      </Badge>
      <Badge size='default' variant='steel'>
        Default
      </Badge>
      <Badge size='lg' variant='gold'>
        Large
      </Badge>
      <Badge size='xl' variant='crimson'>
        Extra Large
      </Badge>
    </div>
  ),
};

export const Interactive: Story = {
  render: () => (
    <div className='space-y-4 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <h3 className='text-lg font-semibold text-foreground-primary mb-4'>Interactive Badges</h3>
      <div className='flex flex-wrap gap-3'>
        <Badge variant='ember' interactive onClick={() => alert('Ember clicked!')}>
          Click me
        </Badge>
        <Badge
          variant='steel'
          interactive
          onClick={() => alert('Steel clicked!')}
          icon={<Shield className='w-3 h-3' />}
        >
          Interactive
        </Badge>
        <Badge
          variant='gold'
          onRemove={() => alert('Removed!')}
          icon={<Crown className='w-3 h-3' />}
        >
          Removable
        </Badge>
        <Badge
          variant='crimson'
          interactive
          onRemove={() => alert('Removed!')}
          onClick={() => alert('Clicked!')}
        >
          Both actions
        </Badge>
      </div>
    </div>
  ),
};

export const CharacterSheet: Story = {
  render: () => (
    <div className='space-y-6 p-6 bg-background-secondary rounded-lg border border-border-primary max-w-md'>
      <div className='space-y-3'>
        <h3 className='text-lg font-semibold text-brand-accent'>Shadows McKenzie</h3>

        <div className='flex flex-wrap gap-2'>
          <Badge variant='master' size='sm' icon={<Star className='w-3 h-3' />}>
            Lurk
          </Badge>
          <Badge variant='expert' size='sm'>
            Prowl
          </Badge>
          <Badge variant='trained' size='sm'>
            Survey
          </Badge>
        </div>

        <div className='flex items-center gap-2'>
          <span className='text-sm text-foreground-muted'>Stress:</span>
          <Badge variant='stress-medium'>4/9</Badge>
        </div>

        <div className='flex flex-wrap gap-2'>
          <Badge variant='ember' size='sm' icon={<Sword className='w-2 h-2' />}>
            Combat Ready
          </Badge>
          <Badge variant='glass' size='sm'>
            Veteran
          </Badge>
          <Badge variant='gold' size='sm' icon={<Crown className='w-2 h-2' />}>
            Crew Leader
          </Badge>
        </div>
      </div>
    </div>
  ),
};

export const PulsingBadge: Story = {
  args: {
    variant: 'stress-critical',
    pulse: true,
    children: 'Critical Alert',
    size: 'lg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Badge with pulsing animation for critical alerts.',
      },
    },
  },
};
