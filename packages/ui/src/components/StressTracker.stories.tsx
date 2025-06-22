import type { Meta, StoryObj } from '@storybook/react';
import { StressTracker, ActionDots, ProgressRing } from './StressTracker';
import { TooltipProvider } from './Tooltip';
import { useState } from 'react';

const meta: Meta<typeof StressTracker> = {
  title: 'Game Components/StressTracker',
  component: StressTracker,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Game-specific components for tracking stress, action dots, and progress in HeistMind. Includes visual feedback for different stress levels and interactive capabilities.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <TooltipProvider>
        <div className='p-6 bg-background-primary rounded-lg'>
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
  argTypes: {
    current: {
      control: { type: 'range', min: 0, max: 9 },
    },
    max: {
      control: { type: 'range', min: 1, max: 12 },
    },
    interactive: {
      control: 'boolean',
    },
    showLabel: {
      control: 'boolean',
    },
    showNumbers: {
      control: 'boolean',
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    current: 3,
    max: 9,
    interactive: false,
    showLabel: true,
    showNumbers: true,
  },
};

export const StressLevels: Story = {
  render: () => (
    <div className='space-y-6'>
      <div className='space-y-4'>
        <h3 className='text-lg font-semibold text-foreground-primary'>Stress Levels</h3>

        <div className='space-y-3'>
          <div className='p-3 bg-background-secondary rounded-lg'>
            <h4 className='text-sm font-medium text-semantic-success mb-2'>Low Stress (0-2)</h4>
            <StressTracker current={1} max={9} />
          </div>

          <div className='p-3 bg-background-secondary rounded-lg'>
            <h4 className='text-sm font-medium text-semantic-warning mb-2'>Medium Stress (3-5)</h4>
            <StressTracker current={4} max={9} />
          </div>

          <div className='p-3 bg-background-secondary rounded-lg'>
            <h4 className='text-sm font-medium text-semantic-warning mb-2'>High Stress (6-7)</h4>
            <StressTracker current={7} max={9} />
          </div>

          <div className='p-3 bg-background-secondary rounded-lg'>
            <h4 className='text-sm font-medium text-semantic-error mb-2'>Critical Stress (8+)</h4>
            <StressTracker current={8} max={9} />
          </div>
        </div>
      </div>
    </div>
  ),
};

export const InteractiveStress: Story = {
  render: () => {
    const [stress, setStress] = useState(3);

    return (
      <div className='space-y-4'>
        <h3 className='text-lg font-semibold text-foreground-primary'>
          Interactive Stress Tracker
        </h3>
        <p className='text-sm text-foreground-muted'>Click the dots to adjust stress level</p>
        <StressTracker current={stress} max={9} onChange={setStress} interactive size='lg' />
        <div className='text-sm text-foreground-secondary'>
          Current stress level: <span className='font-medium'>{stress}/9</span>
        </div>
      </div>
    );
  },
};

export const Sizes: Story = {
  render: () => (
    <div className='space-y-6'>
      <div className='space-y-3'>
        <h4 className='text-sm font-medium text-foreground-primary'>Small</h4>
        <StressTracker current={4} max={9} size='sm' />
      </div>

      <div className='space-y-3'>
        <h4 className='text-sm font-medium text-foreground-primary'>Default</h4>
        <StressTracker current={4} max={9} size='default' />
      </div>

      <div className='space-y-3'>
        <h4 className='text-sm font-medium text-foreground-primary'>Large</h4>
        <StressTracker current={4} max={9} size='lg' />
      </div>
    </div>
  ),
};

export const ActionDotsStory: Story = {
  render: () => {
    const [prowess, setProwess] = useState(2);
    const [insight, setInsight] = useState(1);
    const [resolve, setResolve] = useState(3);

    return (
      <div className='space-y-6'>
        <h3 className='text-lg font-semibold text-foreground-primary'>Action Dots</h3>

        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='space-y-3'>
            <ActionDots
              current={prowess}
              max={4}
              onChange={setProwess}
              interactive
              label='Prowess'
              variant='ember'
              size='default'
            />
          </div>

          <div className='space-y-3'>
            <ActionDots
              current={insight}
              max={4}
              onChange={setInsight}
              interactive
              label='Insight'
              variant='steel'
              size='default'
            />
          </div>

          <div className='space-y-3'>
            <ActionDots
              current={resolve}
              max={4}
              onChange={setResolve}
              interactive
              label='Resolve'
              variant='crimson'
              size='default'
            />
          </div>
        </div>
      </div>
    );
  },
};

export const ActionDotVariants: Story = {
  render: () => (
    <div className='space-y-6'>
      <h3 className='text-lg font-semibold text-foreground-primary'>Action Dot Variants</h3>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
        <ActionDots current={2} max={4} label='Default' variant='default' />

        <ActionDots current={3} max={4} label='Ember' variant='ember' />

        <ActionDots current={1} max={4} label='Steel' variant='steel' />

        <ActionDots current={4} max={4} label='Shadow' variant='shadow' />

        <ActionDots current={2} max={4} label='Crimson' variant='crimson' />
      </div>
    </div>
  ),
};

export const ProgressRings: Story = {
  render: () => (
    <div className='space-y-6'>
      <h3 className='text-lg font-semibold text-foreground-primary'>Progress Rings</h3>

      <div className='grid grid-cols-2 md:grid-cols-4 gap-6'>
        <div className='text-center space-y-2'>
          <ProgressRing current={3} max={9} variant='stress' />
          <div className='text-sm text-foreground-muted'>Stress</div>
        </div>

        <div className='text-center space-y-2'>
          <ProgressRing current={6} max={8} variant='ember' />
          <div className='text-sm text-foreground-muted'>Heat</div>
        </div>

        <div className='text-center space-y-2'>
          <ProgressRing current={4} max={12} variant='steel' />
          <div className='text-sm text-foreground-muted'>Rep</div>
        </div>

        <div className='text-center space-y-2'>
          <ProgressRing current={2} max={4} variant='crimson' />
          <div className='text-sm text-foreground-muted'>Trauma</div>
        </div>
      </div>
    </div>
  ),
};

export const CharacterSheet: Story = {
  render: () => {
    const [stress, setStress] = useState(5);
    const [heat, setHeat] = useState(3);
    const [prowess, setProwess] = useState(3);
    const [insight, setInsight] = useState(2);
    const [resolve, setResolve] = useState(2);

    return (
      <div className='max-w-md space-y-6 p-6 bg-background-secondary rounded-lg'>
        <h3 className='text-xl font-semibold text-brand-accent'>Character Sheet</h3>

        <div className='space-y-4'>
          <StressTracker current={stress} max={9} onChange={setStress} interactive size='default' />

          <div className='grid grid-cols-2 gap-4'>
            <ProgressRing current={heat} max={8} variant='ember' size={80} showLabel />
            <ProgressRing current={stress} max={9} variant='stress' size={80} showLabel />
          </div>

          <div className='space-y-3'>
            <h4 className='text-sm font-medium text-foreground-primary'>Attributes</h4>
            <ActionDots
              current={prowess}
              max={4}
              onChange={setProwess}
              interactive
              label='Prowess'
              variant='ember'
            />
            <ActionDots
              current={insight}
              max={4}
              onChange={setInsight}
              interactive
              label='Insight'
              variant='steel'
            />
            <ActionDots
              current={resolve}
              max={4}
              onChange={setResolve}
              interactive
              label='Resolve'
              variant='crimson'
            />
          </div>
        </div>
      </div>
    );
  },
};
