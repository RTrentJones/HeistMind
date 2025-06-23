import type { Meta, StoryObj } from '@storybook/react';
import { LoadingSpinner } from './LoadingSpinner';

const meta: Meta<typeof LoadingSpinner> = {
  title: 'Status & Feedback/LoadingSpinner',
  component: LoadingSpinner,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Animated loading spinner with customizable appearance and text support.',
      },
    },
  },
  argTypes: {
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
      description: 'Spinner size',
    },
    variant: {
      control: { type: 'select' },
      options: [
        'default',
        'primary',
        'secondary',
        'muted',
        'accent',
        'success',
        'warning',
        'error',
        'white',
      ],
      description: 'Color variant',
    },
    speed: {
      control: { type: 'select' },
      options: ['slow', 'normal', 'fast'],
      description: 'Animation speed',
    },
    text: {
      control: { type: 'text' },
      description: 'Loading text to display',
    },
    textVariant: {
      control: { type: 'select' },
      options: ['default', 'muted', 'secondary'],
      description: 'Text color variant',
    },
    spacing: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg'],
      description: 'Gap between spinner and text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: 'default',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className='flex gap-6 items-center'>
      <div className='text-center'>
        <LoadingSpinner size='xs' />
        <div className='text-xs mt-2 text-foreground-muted'>XS</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner size='sm' />
        <div className='text-xs mt-2 text-foreground-muted'>SM</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner size='md' />
        <div className='text-xs mt-2 text-foreground-muted'>MD</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner size='lg' />
        <div className='text-xs mt-2 text-foreground-muted'>LG</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner size='xl' />
        <div className='text-xs mt-2 text-foreground-muted'>XL</div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading spinner size variations from extra small to extra large.',
      },
    },
  },
};

export const Variants: Story = {
  render: () => (
    <div className='grid grid-cols-3 gap-4'>
      <div className='text-center'>
        <LoadingSpinner variant='default' />
        <div className='text-xs mt-2 text-foreground-muted'>Default</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner variant='primary' />
        <div className='text-xs mt-2 text-foreground-muted'>Primary</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner variant='secondary' />
        <div className='text-xs mt-2 text-foreground-muted'>Secondary</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner variant='muted' />
        <div className='text-xs mt-2 text-foreground-muted'>Muted</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner variant='accent' />
        <div className='text-xs mt-2 text-foreground-muted'>Accent</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner variant='success' />
        <div className='text-xs mt-2 text-foreground-muted'>Success</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner variant='warning' />
        <div className='text-xs mt-2 text-foreground-muted'>Warning</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner variant='error' />
        <div className='text-xs mt-2 text-foreground-muted'>Error</div>
      </div>
      <div className='text-center bg-background-primary p-2 rounded'>
        <LoadingSpinner variant='white' />
        <div className='text-xs mt-2 text-foreground-muted'>White</div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available color variants for different contexts.',
      },
    },
  },
};

export const Speeds: Story = {
  render: () => (
    <div className='flex gap-8 items-center'>
      <div className='text-center'>
        <LoadingSpinner speed='slow' />
        <div className='text-xs mt-2 text-foreground-muted'>Slow (2s)</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner speed='normal' />
        <div className='text-xs mt-2 text-foreground-muted'>Normal (1s)</div>
      </div>
      <div className='text-center'>
        <LoadingSpinner speed='fast' />
        <div className='text-xs mt-2 text-foreground-muted'>Fast (0.5s)</div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different animation speeds for various loading contexts.',
      },
    },
  },
};

export const WithText: Story = {
  render: () => (
    <div className='space-y-4'>
      <LoadingSpinner text='Loading...' />
      <LoadingSpinner text='Processing request...' variant='primary' />
      <LoadingSpinner text='Saving changes...' variant='accent' size='lg' />
      <LoadingSpinner text='Please wait...' variant='muted' textVariant='muted' />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading spinners with descriptive text labels.',
      },
    },
  },
};

export const TextVariants: Story = {
  render: () => (
    <div className='space-y-4'>
      <LoadingSpinner text='Default text color' textVariant='default' />
      <LoadingSpinner text='Muted text color' textVariant='muted' />
      <LoadingSpinner text='Secondary text color' textVariant='secondary' />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different text color variants for the loading message.',
      },
    },
  },
};

export const Spacing: Story = {
  render: () => (
    <div className='space-y-4'>
      <LoadingSpinner text='No spacing' spacing='none' />
      <LoadingSpinner text='Small spacing' spacing='sm' />
      <LoadingSpinner text='Medium spacing' spacing='md' />
      <LoadingSpinner text='Large spacing' spacing='lg' />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different spacing options between spinner and text.',
      },
    },
  },
};

export const InButtons: Story = {
  render: () => (
    <div className='flex gap-4'>
      <button
        className='bg-brand-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50'
        disabled
      >
        <LoadingSpinner size='sm' variant='white' />
        Loading...
      </button>
      <button
        className='bg-background-secondary border border-border-primary px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50'
        disabled
      >
        <LoadingSpinner size='sm' variant='primary' />
        Processing
      </button>
      <button
        className='bg-semantic-success text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50'
        disabled
      >
        <LoadingSpinner size='sm' variant='white' />
        Saving
      </button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading spinners integrated into button components.',
      },
    },
  },
};

export const InCards: Story = {
  render: () => (
    <div className='grid grid-cols-2 gap-4 max-w-lg'>
      <div className='p-6 border border-border-primary rounded-lg text-center'>
        <LoadingSpinner size='lg' variant='primary' />
        <h3 className='font-semibold text-foreground-primary mt-4 mb-2'>Loading Data</h3>
        <p className='text-sm text-foreground-secondary'>Fetching your information...</p>
      </div>

      <div className='p-6 border border-border-primary rounded-lg'>
        <div className='flex items-center gap-3 mb-4'>
          <LoadingSpinner size='md' variant='accent' />
          <h3 className='font-semibold text-foreground-primary'>Syncing</h3>
        </div>
        <p className='text-sm text-foreground-secondary'>Updating your preferences and settings.</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Loading spinners used in card layouts for different loading states.',
      },
    },
  },
};

export const FullPageLoading: Story = {
  render: () => (
    <div className='min-h-[200px] flex items-center justify-center bg-background-secondary rounded-lg'>
      <div className='text-center'>
        <LoadingSpinner size='xl' variant='primary' />
        <h2 className='text-lg font-semibold text-foreground-primary mt-4 mb-2'>
          Loading Application
        </h2>
        <p className='text-foreground-secondary'>
          Please wait while we prepare everything for you...
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Full-page loading state with large spinner and descriptive text.',
      },
    },
  },
};

export const GameLoading: Story = {
  render: () => (
    <div className='p-6 bg-background-tertiary rounded-lg space-y-4'>
      <div className='text-center'>
        <LoadingSpinner size='lg' variant='accent' speed='slow' />
        <h3 className='font-semibold text-foreground-primary mt-3 mb-2'>Initializing Session</h3>
        <p className='text-sm text-foreground-secondary'>
          Loading character data and game state...
        </p>
      </div>

      <div className='space-y-2 text-sm'>
        <div className='flex items-center gap-2'>
          <LoadingSpinner size='xs' variant='success' />
          <span className='text-foreground-secondary'>Characters loaded</span>
        </div>
        <div className='flex items-center gap-2'>
          <LoadingSpinner size='xs' variant='primary' />
          <span className='text-foreground-secondary'>Loading campaign data...</span>
        </div>
        <div className='flex items-center gap-2'>
          <LoadingSpinner size='xs' variant='muted' />
          <span className='text-foreground-muted'>Pending: Game assets</span>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Game-specific loading interface with progress indicators.',
      },
    },
  },
};
