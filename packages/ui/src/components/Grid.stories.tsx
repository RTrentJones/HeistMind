import type { Meta, StoryObj } from '@storybook/react';
import { Grid } from './Grid';

const meta: Meta<typeof Grid> = {
  title: 'Layout/Grid',
  component: Grid,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Responsive CSS Grid layout component with flexible column configurations and animations.',
      },
    },
  },
  argTypes: {
    cols: {
      control: { type: 'select' },
      options: [1, 2, 3, 4, 5, 6, 12, 'auto', 'auto-sm', 'auto-lg'],
      description: 'Number of columns or auto-sizing behavior',
    },
    gap: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Gap between grid items',
    },
    align: {
      control: { type: 'select' },
      options: ['start', 'center', 'end', 'stretch'],
      description: 'Vertical alignment of grid items',
    },
    justify: {
      control: { type: 'select' },
      options: ['start', 'center', 'end', 'stretch'],
      description: 'Horizontal alignment of grid items',
    },
    as: {
      control: { type: 'select' },
      options: ['div', 'section', 'article'],
      description: 'HTML element to render',
    },
    animateChildren: {
      control: { type: 'boolean' },
      description: 'Enable staggered animation for children',
    },
    staggerDelay: {
      control: { type: 'range', min: 0, max: 0.5, step: 0.05 },
      description: 'Delay between child animations',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample card component for demonstrations
const SampleCard = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`p-4 bg-background-secondary border border-border-primary rounded-lg ${className}`}
  >
    {children}
  </div>
);

export const Default: Story = {
  render: () => (
    <Grid>
      <SampleCard>Item 1</SampleCard>
      <SampleCard>Item 2</SampleCard>
      <SampleCard>Item 3</SampleCard>
      <SampleCard>Item 4</SampleCard>
    </Grid>
  ),
};

export const ResponsiveColumns: Story = {
  render: () => (
    <div className='space-y-8'>
      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>
          2 Columns (1 on mobile, 2 on desktop)
        </h3>
        <Grid cols={2}>
          <SampleCard>Card 1</SampleCard>
          <SampleCard>Card 2</SampleCard>
          <SampleCard>Card 3</SampleCard>
          <SampleCard>Card 4</SampleCard>
        </Grid>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>
          3 Columns (responsive)
        </h3>
        <Grid cols={3}>
          <SampleCard>Card 1</SampleCard>
          <SampleCard>Card 2</SampleCard>
          <SampleCard>Card 3</SampleCard>
          <SampleCard>Card 4</SampleCard>
          <SampleCard>Card 5</SampleCard>
          <SampleCard>Card 6</SampleCard>
        </Grid>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>
          4 Columns (responsive)
        </h3>
        <Grid cols={4}>
          <SampleCard>Card 1</SampleCard>
          <SampleCard>Card 2</SampleCard>
          <SampleCard>Card 3</SampleCard>
          <SampleCard>Card 4</SampleCard>
          <SampleCard>Card 5</SampleCard>
          <SampleCard>Card 6</SampleCard>
          <SampleCard>Card 7</SampleCard>
          <SampleCard>Card 8</SampleCard>
        </Grid>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Responsive column layouts that adapt to screen size.',
      },
    },
  },
};

export const AutoSizing: Story = {
  render: () => (
    <div className='space-y-8'>
      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Auto (250px minimum)</h3>
        <Grid cols='auto'>
          <SampleCard>Short</SampleCard>
          <SampleCard>Medium content</SampleCard>
          <SampleCard>This is longer content that spans more space</SampleCard>
          <SampleCard>Content</SampleCard>
          <SampleCard>Variable</SampleCard>
        </Grid>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>
          Auto Small (200px minimum)
        </h3>
        <Grid cols='auto-sm'>
          <SampleCard>Item 1</SampleCard>
          <SampleCard>Item 2</SampleCard>
          <SampleCard>Item 3</SampleCard>
          <SampleCard>Item 4</SampleCard>
          <SampleCard>Item 5</SampleCard>
          <SampleCard>Item 6</SampleCard>
        </Grid>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>
          Auto Large (300px minimum)
        </h3>
        <Grid cols='auto-lg'>
          <SampleCard>Feature Card</SampleCard>
          <SampleCard>Another Feature</SampleCard>
          <SampleCard>Third Feature</SampleCard>
        </Grid>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Auto-sizing columns with different minimum widths.',
      },
    },
  },
};

export const Gaps: Story = {
  render: () => (
    <div className='space-y-8'>
      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>No Gap</h3>
        <Grid cols={3} gap='none'>
          <SampleCard>Item 1</SampleCard>
          <SampleCard>Item 2</SampleCard>
          <SampleCard>Item 3</SampleCard>
        </Grid>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Small Gap</h3>
        <Grid cols={3} gap='sm'>
          <SampleCard>Item 1</SampleCard>
          <SampleCard>Item 2</SampleCard>
          <SampleCard>Item 3</SampleCard>
        </Grid>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Large Gap</h3>
        <Grid cols={3} gap='lg'>
          <SampleCard>Item 1</SampleCard>
          <SampleCard>Item 2</SampleCard>
          <SampleCard>Item 3</SampleCard>
        </Grid>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Extra Large Gap</h3>
        <Grid cols={3} gap='2xl'>
          <SampleCard>Item 1</SampleCard>
          <SampleCard>Item 2</SampleCard>
          <SampleCard>Item 3</SampleCard>
        </Grid>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different gap sizes between grid items.',
      },
    },
  },
};

export const Alignment: Story = {
  render: () => (
    <div className='space-y-8'>
      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Items Start</h3>
        <Grid cols={3} align='start' className='min-h-[120px] bg-background-tertiary rounded'>
          <SampleCard className='h-16'>Short</SampleCard>
          <SampleCard className='h-20'>Medium</SampleCard>
          <SampleCard className='h-12'>Tall</SampleCard>
        </Grid>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Items Center</h3>
        <Grid cols={3} align='center' className='min-h-[120px] bg-background-tertiary rounded'>
          <SampleCard className='h-16'>Short</SampleCard>
          <SampleCard className='h-20'>Medium</SampleCard>
          <SampleCard className='h-12'>Tall</SampleCard>
        </Grid>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Items Stretch</h3>
        <Grid cols={3} align='stretch' className='min-h-[120px] bg-background-tertiary rounded'>
          <SampleCard>Auto Height</SampleCard>
          <SampleCard>Auto Height</SampleCard>
          <SampleCard>Auto Height</SampleCard>
        </Grid>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Vertical alignment options for grid items.',
      },
    },
  },
};

export const WithAnimation: Story = {
  render: () => (
    <Grid cols={3} animateChildren staggerDelay={0.1}>
      <SampleCard>Animated Item 1</SampleCard>
      <SampleCard>Animated Item 2</SampleCard>
      <SampleCard>Animated Item 3</SampleCard>
      <SampleCard>Animated Item 4</SampleCard>
      <SampleCard>Animated Item 5</SampleCard>
      <SampleCard>Animated Item 6</SampleCard>
    </Grid>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Grid with staggered animation for child elements.',
      },
    },
  },
};

export const FeatureCards: Story = {
  render: () => (
    <Grid cols={3} gap='lg' animateChildren>
      <div className='p-6 bg-background-secondary border border-border-primary rounded-xl text-center'>
        <div className='w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4'>
          <span className='text-2xl'>⚔️</span>
        </div>
        <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Combat System</h3>
        <p className='text-foreground-secondary text-sm'>
          Tactical combat with position and timing mechanics.
        </p>
      </div>

      <div className='p-6 bg-background-secondary border border-border-primary rounded-xl text-center'>
        <div className='w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4'>
          <span className='text-2xl'>🎲</span>
        </div>
        <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Dice Rolling</h3>
        <p className='text-foreground-secondary text-sm'>
          Advanced dice mechanics with modifiers and effects.
        </p>
      </div>

      <div className='p-6 bg-background-secondary border border-border-primary rounded-xl text-center'>
        <div className='w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4'>
          <span className='text-2xl'>👥</span>
        </div>
        <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Party Management</h3>
        <p className='text-foreground-secondary text-sm'>
          Coordinate with your crew and track relationships.
        </p>
      </div>

      <div className='p-6 bg-background-secondary border border-border-primary rounded-xl text-center'>
        <div className='w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4'>
          <span className='text-2xl'>📜</span>
        </div>
        <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Story Tracking</h3>
        <p className='text-foreground-secondary text-sm'>
          Keep detailed records of your adventures and choices.
        </p>
      </div>

      <div className='p-6 bg-background-secondary border border-border-primary rounded-xl text-center'>
        <div className='w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4'>
          <span className='text-2xl'>🏆</span>
        </div>
        <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Achievements</h3>
        <p className='text-foreground-secondary text-sm'>
          Unlock rewards and track your progress over time.
        </p>
      </div>

      <div className='p-6 bg-background-secondary border border-border-primary rounded-xl text-center'>
        <div className='w-12 h-12 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4'>
          <span className='text-2xl'>🌐</span>
        </div>
        <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Online Play</h3>
        <p className='text-foreground-secondary text-sm'>
          Connect with players worldwide for remote sessions.
        </p>
      </div>
    </Grid>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Real-world example with feature cards for a game application.',
      },
    },
  },
};

export const CharacterGrid: Story = {
  render: () => (
    <Grid cols='auto' gap='md'>
      <div className='p-4 bg-background-elevated border border-border-primary rounded-lg min-w-[200px]'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center text-white font-bold'>
            A
          </div>
          <div>
            <h3 className='font-semibold text-foreground-primary'>Aria Shadowbane</h3>
            <p className='text-sm text-foreground-secondary'>Lurk • Level 3</p>
          </div>
        </div>
        <div className='text-xs text-foreground-muted'>Stress: 2/9 • XP: 5/8</div>
      </div>

      <div className='p-4 bg-background-elevated border border-border-primary rounded-lg min-w-[200px]'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-10 h-10 bg-game-ember rounded-full flex items-center justify-center text-white font-bold'>
            R
          </div>
          <div>
            <h3 className='font-semibold text-foreground-primary'>Raven Quickstrike</h3>
            <p className='text-sm text-foreground-secondary'>Cutter • Level 2</p>
          </div>
        </div>
        <div className='text-xs text-foreground-muted'>Stress: 4/9 • XP: 2/8</div>
      </div>

      <div className='p-4 bg-background-elevated border border-border-primary rounded-lg min-w-[200px]'>
        <div className='flex items-center gap-3 mb-3'>
          <div className='w-10 h-10 bg-semantic-success rounded-full flex items-center justify-center text-white font-bold'>
            M
          </div>
          <div>
            <h3 className='font-semibold text-foreground-primary'>Magnus Ironheart</h3>
            <p className='text-sm text-foreground-secondary'>Leech • Level 4</p>
          </div>
        </div>
        <div className='text-xs text-foreground-muted'>Stress: 1/9 • XP: 7/8</div>
      </div>
    </Grid>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Character cards in an auto-sizing grid layout.',
      },
    },
  },
};
