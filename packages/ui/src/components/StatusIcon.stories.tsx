import type { Meta, StoryObj } from '@storybook/react';
import { StatusIcon } from './StatusIcon';

const meta: Meta<typeof StatusIcon> = {
  title: 'Status & Feedback/StatusIcon',
  component: StatusIcon,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Status indicator icon with semantic colors and animations for user feedback.',
      },
    },
  },
  argTypes: {
    status: {
      control: { type: 'select' },
      options: ['success', 'error', 'warning', 'info', 'loading', 'neutral'],
      description: 'Status type determining color and default icon',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg', 'xl'],
      description: 'Icon size',
    },
    animation: {
      control: { type: 'select' },
      options: ['none', 'pulse', 'bounce', 'spin'],
      description: 'Animation type',
    },
    animate: {
      control: { type: 'boolean' },
      description: 'Enable mount animation',
    },
    icon: {
      control: { type: 'text' },
      description: 'Custom icon content',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    status: 'neutral',
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className='flex gap-4 items-center'>
      <StatusIcon status='success' />
      <StatusIcon status='error' />
      <StatusIcon status='warning' />
      <StatusIcon status='info' />
      <StatusIcon status='loading' />
      <StatusIcon status='neutral' />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available status types with their default icons and colors.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <div className='flex gap-4 items-center'>
      <StatusIcon status='success' size='sm' />
      <StatusIcon status='success' size='md' />
      <StatusIcon status='success' size='lg' />
      <StatusIcon status='success' size='xl' />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Status icon size variations from small to extra large.',
      },
    },
  },
};

export const Animations: Story = {
  render: () => (
    <div className='flex gap-6 items-center'>
      <div className='text-center'>
        <StatusIcon status='loading' animation='none' />
        <div className='text-xs mt-2 text-foreground-muted'>None</div>
      </div>
      <div className='text-center'>
        <StatusIcon status='warning' animation='pulse' />
        <div className='text-xs mt-2 text-foreground-muted'>Pulse</div>
      </div>
      <div className='text-center'>
        <StatusIcon status='success' animation='bounce' />
        <div className='text-xs mt-2 text-foreground-muted'>Bounce</div>
      </div>
      <div className='text-center'>
        <StatusIcon status='loading' animation='spin' />
        <div className='text-xs mt-2 text-foreground-muted'>Spin</div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different animation types for drawing attention.',
      },
    },
  },
};

export const CustomIcons: Story = {
  render: () => (
    <div className='flex gap-4 items-center'>
      <StatusIcon status='success' icon='🎉' />
      <StatusIcon status='error' icon='🚫' />
      <StatusIcon status='warning' icon='⚡' />
      <StatusIcon status='info' icon='💡' />
      <StatusIcon status='loading' icon='⏳' />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Custom icons while maintaining status colors.',
      },
    },
  },
};

export const WithLabels: Story = {
  render: () => (
    <div className='space-y-4'>
      <div className='flex items-center gap-3'>
        <StatusIcon status='success' />
        <span className='text-foreground-primary'>Operation completed successfully</span>
      </div>
      <div className='flex items-center gap-3'>
        <StatusIcon status='error' />
        <span className='text-foreground-primary'>Failed to process request</span>
      </div>
      <div className='flex items-center gap-3'>
        <StatusIcon status='warning' />
        <span className='text-foreground-primary'>Please verify your input</span>
      </div>
      <div className='flex items-center gap-3'>
        <StatusIcon status='info' />
        <span className='text-foreground-primary'>New updates available</span>
      </div>
      <div className='flex items-center gap-3'>
        <StatusIcon status='loading' animation='spin' />
        <span className='text-foreground-primary'>Processing your request...</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Status icons used with descriptive labels.',
      },
    },
  },
};

export const InCards: Story = {
  render: () => (
    <div className='grid grid-cols-2 gap-4 max-w-lg'>
      <div className='p-4 border border-border-primary rounded-lg'>
        <div className='flex items-center gap-3 mb-2'>
          <StatusIcon status='success' size='lg' />
          <h3 className='font-semibold text-foreground-primary'>Deployment</h3>
        </div>
        <p className='text-sm text-foreground-secondary'>Successfully deployed to production</p>
      </div>

      <div className='p-4 border border-border-primary rounded-lg'>
        <div className='flex items-center gap-3 mb-2'>
          <StatusIcon status='error' size='lg' />
          <h3 className='font-semibold text-foreground-primary'>Build Failed</h3>
        </div>
        <p className='text-sm text-foreground-secondary'>Compilation errors detected</p>
      </div>

      <div className='p-4 border border-border-primary rounded-lg'>
        <div className='flex items-center gap-3 mb-2'>
          <StatusIcon status='loading' size='lg' animation='spin' />
          <h3 className='font-semibold text-foreground-primary'>In Progress</h3>
        </div>
        <p className='text-sm text-foreground-secondary'>Running tests and validations</p>
      </div>

      <div className='p-4 border border-border-primary rounded-lg'>
        <div className='flex items-center gap-3 mb-2'>
          <StatusIcon status='warning' size='lg' animation='pulse' />
          <h3 className='font-semibold text-foreground-primary'>Attention</h3>
        </div>
        <p className='text-sm text-foreground-secondary'>Manual review required</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Status icons used in card layouts for system status.',
      },
    },
  },
};

export const WithAnimation: Story = {
  args: {
    status: 'success',
    animate: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Status icon with mount animation enabled.',
      },
    },
  },
};

export const GameStatus: Story = {
  render: () => (
    <div className='p-4 bg-background-tertiary rounded-lg space-y-3'>
      <div className='flex items-center gap-3'>
        <StatusIcon status='success' icon='⚔️' />
        <span className='text-foreground-primary'>Combat successful</span>
      </div>
      <div className='flex items-center gap-3'>
        <StatusIcon status='warning' icon='💀' animation='pulse' />
        <span className='text-foreground-primary'>Character injured</span>
      </div>
      <div className='flex items-center gap-3'>
        <StatusIcon status='info' icon='🎲' />
        <span className='text-foreground-primary'>Roll required</span>
      </div>
      <div className='flex items-center gap-3'>
        <StatusIcon status='loading' icon='⏰' animation='spin' />
        <span className='text-foreground-primary'>Waiting for players...</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Game-themed status indicators with custom icons.',
      },
    },
  },
};
