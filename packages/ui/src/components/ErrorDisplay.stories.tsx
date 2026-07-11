import type { Meta, StoryObj } from '@storybook/react';
import { ErrorDisplay } from './ErrorDisplay';

const meta: Meta<typeof ErrorDisplay> = {
  title: 'Status & Feedback/ErrorDisplay',
  component: ErrorDisplay,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Comprehensive error display component with icons, actions, and layout options.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'subtle', 'solid', 'outline'],
      description: 'Visual style variant',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
      description: 'Component size',
    },
    layout: {
      control: { type: 'select' },
      options: ['inline', 'stacked', 'centered'],
      description: 'Content layout arrangement',
    },
    title: {
      control: { type: 'text' },
      description: 'Error title/heading',
    },
    message: {
      control: { type: 'text' },
      description: 'Error message/description',
    },
    hideIcon: {
      control: { type: 'boolean' },
      description: 'Hide default error icon',
    },
    animate: {
      control: { type: 'boolean' },
      description: 'Enable mount animation',
    },
    retryText: {
      control: { type: 'text' },
      description: 'Retry button text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Something went wrong',
    message: 'An unexpected error occurred. Please try again.',
  },
};

export const Variants: Story = {
  render: () => (
    <div className='space-y-4'>
      <ErrorDisplay
        variant='default'
        title='Default Error'
        message='This is the default error display variant.'
      />
      <ErrorDisplay
        variant='subtle'
        title='Subtle Error'
        message='This is a subtle error display for less critical issues.'
      />
      <ErrorDisplay
        variant='solid'
        title='Critical Error'
        message='This is a solid error display for critical issues.'
      />
      <ErrorDisplay
        variant='outline'
        title='Outlined Error'
        message='This is an outlined error display variant.'
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available visual variants for different error severities.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <div className='space-y-4'>
      <ErrorDisplay
        size='sm'
        title='Small Error'
        message='This is a small error display for compact layouts.'
      />
      <ErrorDisplay
        size='md'
        title='Medium Error'
        message='This is a medium error display for standard layouts.'
      />
      <ErrorDisplay
        size='lg'
        title='Large Error'
        message='This is a large error display for prominent error states.'
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Size variations for different layout contexts.',
      },
    },
  },
};

export const Layouts: Story = {
  render: () => (
    <div className='space-y-6'>
      <ErrorDisplay
        layout='inline'
        title='Inline Layout'
        message='Icon, content, and actions arranged horizontally.'
        onRetry={() => console.log('Retry clicked')}
      />
      <ErrorDisplay
        layout='stacked'
        title='Stacked Layout'
        message='Icon, content, and actions arranged vertically.'
        onRetry={() => console.log('Retry clicked')}
      />
      <ErrorDisplay
        layout='centered'
        title='Centered Layout'
        message='All content centered for prominent display.'
        onRetry={() => console.log('Retry clicked')}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different layout arrangements for various use cases.',
      },
    },
  },
};

export const WithActions: Story = {
  render: () => (
    <div className='space-y-4'>
      <ErrorDisplay
        title='Network Error'
        message='Failed to connect to the server.'
        onRetry={() => console.log('Retry clicked')}
        retryText='Try Again'
      />
      <ErrorDisplay
        title='Validation Error'
        message='Please check your input and try again.'
        onRetry={() => console.log('Retry clicked')}
        onDismiss={() => console.log('Dismiss clicked')}
        action={{
          label: 'View Details',
          onClick: () => console.log('View details clicked'),
          variant: 'ghost',
        }}
      />
      <ErrorDisplay
        title='Permission Denied'
        message="You don't have permission to perform this action."
        action={{
          label: 'Contact Support',
          onClick: () => console.log('Contact support clicked'),
          variant: 'outline',
        }}
        onDismiss={() => console.log('Dismiss clicked')}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Error displays with various action buttons.',
      },
    },
  },
};

export const CustomIcons: Story = {
  render: () => (
    <div className='space-y-4'>
      <ErrorDisplay
        title='Network Timeout'
        message='Request timed out. Please check your connection.'
        icon='🌐'
      />
      <ErrorDisplay
        title='File Not Found'
        message='The requested file could not be located.'
        icon='📄'
      />
      <ErrorDisplay
        title='Server Maintenance'
        message='Service temporarily unavailable.'
        icon='🔧'
      />
      <ErrorDisplay title='No Icon' message='This error display has no icon.' hideIcon />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Custom icons and hidden icon options.',
      },
    },
  },
};

export const WithAdditionalContent: Story = {
  render: () => (
    <ErrorDisplay
      title='Database Connection Failed'
      message='Unable to establish connection to the database.'
      onRetry={() => console.log('Retry clicked')}
    >
      <div className='mt-2 p-3 bg-background-tertiary rounded border text-xs font-mono'>
        Error: ECONNREFUSED 127.0.0.1:5432
        <br />
        at Connection.connect (/app/db.js:42:15)
      </div>
    </ErrorDisplay>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Error display with additional technical details.',
      },
    },
  },
};

export const FormValidation: Story = {
  render: () => (
    <div className='space-y-4 max-w-md'>
      <div>
        {/* htmlFor/id pairing — a visually adjacent label is not an ACCESSIBLE label. */}
        <label
          htmlFor='form-validation-email'
          className='block text-sm font-medium text-foreground-primary mb-1'
        >
          Email Address
        </label>
        <input
          id='form-validation-email'
          type='email'
          className='w-full px-3 py-2 border border-semantic-error rounded-lg focus:outline-none focus:ring-2 focus:ring-semantic-error'
          value='invalid-email'
          readOnly
        />
        <ErrorDisplay
          variant='outline'
          size='sm'
          layout='inline'
          message='Please enter a valid email address.'
          hideIcon
          className='mt-1'
        />
      </div>

      <div>
        <label
          htmlFor='form-validation-password'
          className='block text-sm font-medium text-foreground-primary mb-1'
        >
          Password
        </label>
        <input
          id='form-validation-password'
          type='password'
          className='w-full px-3 py-2 border border-semantic-error rounded-lg focus:outline-none focus:ring-2 focus:ring-semantic-error'
          value='123'
          readOnly
        />
        <ErrorDisplay
          variant='default'
          size='sm'
          layout='stacked'
          message='Password must be at least 8 characters long.'
          className='mt-1'
        />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Error displays used for form validation feedback.',
      },
    },
  },
};

export const ApplicationErrors: Story = {
  render: () => (
    <div className='space-y-6'>
      <ErrorDisplay
        variant='solid'
        layout='centered'
        title='Application Error'
        message='The application encountered an unexpected error and needs to restart.'
        onRetry={() => console.log('Restart clicked')}
        retryText='Restart App'
        action={{
          label: 'Send Report',
          onClick: () => console.log('Send report clicked'),
          variant: 'secondary',
        }}
      />

      <ErrorDisplay
        variant='default'
        layout='inline'
        title='Feature Unavailable'
        message='This feature is temporarily disabled for maintenance.'
        action={{
          label: 'Learn More',
          onClick: () => console.log('Learn more clicked'),
          variant: 'ghost',
        }}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Application-level error states with different severities.',
      },
    },
  },
};

export const WithAnimation: Story = {
  args: {
    title: 'Animated Error',
    message: 'This error display animates in when it appears.',
    animate: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Error display with mount animation enabled.',
      },
    },
  },
};

export const GameErrors: Story = {
  render: () => (
    <div className='p-4 bg-background-tertiary rounded-lg space-y-4'>
      <ErrorDisplay
        variant='default'
        layout='inline'
        title='Character Creation Failed'
        message='Unable to save character data.'
        icon='⚔️'
        onRetry={() => console.log('Retry character creation')}
        retryText='Try Again'
      />

      <ErrorDisplay
        variant='outline'
        layout='stacked'
        title='Session Expired'
        message='Your game session has timed out. Please reconnect.'
        icon='⏰'
        action={{
          label: 'Reconnect',
          onClick: () => console.log('Reconnect to game'),
          variant: 'outline',
        }}
      />

      <ErrorDisplay
        variant='subtle'
        layout='inline'
        title='Dice Roll Error'
        message='Invalid dice configuration. Please check your settings.'
        icon='🎲'
        onDismiss={() => console.log('Dismiss dice error')}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Game-specific error states with thematic icons.',
      },
    },
  },
};
