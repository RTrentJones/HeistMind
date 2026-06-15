import type { Meta, StoryObj } from '@storybook/react';
import { Text } from './Text';

const meta: Meta<typeof Text> = {
  title: 'Typography/Text',
  component: Text,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Flexible text component with semantic variants, sizes, and styling options.',
      },
    },
  },
  argTypes: {
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
        'info',
        'game',
        'subtle',
      ],
      description: 'Visual style variant',
    },
    size: {
      control: { type: 'select' },
      options: ['xs', 'sm', 'base', 'lg', 'xl', '2xl'],
      description: 'Text size',
    },
    weight: {
      control: { type: 'select' },
      options: ['normal', 'medium', 'semibold', 'bold'],
      description: 'Font weight',
    },
    align: {
      control: { type: 'select' },
      options: ['left', 'center', 'right', 'justify'],
      description: 'Text alignment',
    },
    spacing: {
      control: { type: 'select' },
      options: ['tight', 'normal', 'relaxed', 'loose'],
      description: 'Line height spacing',
    },
    decoration: {
      control: { type: 'select' },
      options: ['none', 'underline', 'overline', 'line-through'],
      description: 'Text decoration',
    },
    transform: {
      control: { type: 'select' },
      options: ['none', 'uppercase', 'lowercase', 'capitalize'],
      description: 'Text transform',
    },
    as: {
      control: { type: 'select' },
      options: ['p', 'span', 'div', 'label', 'caption', 'strong', 'em', 'small'],
      description: 'HTML element to render',
    },
    animate: {
      control: { type: 'boolean' },
      description: 'Enable mount animation',
    },
    truncate: {
      control: { type: 'boolean' },
      description: 'Truncate text with ellipsis',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default text content',
    variant: 'default',
  },
};

export const Variants: Story = {
  render: () => (
    <div className='space-y-2'>
      <Text variant='default'>Default text variant</Text>
      <Text variant='primary'>Primary text variant</Text>
      <Text variant='secondary'>Secondary text variant</Text>
      <Text variant='muted'>Muted text variant</Text>
      <Text variant='accent'>Accent text variant</Text>
      <Text variant='success'>Success text variant</Text>
      <Text variant='warning'>Warning text variant</Text>
      <Text variant='error'>Error text variant</Text>
      <Text variant='info'>Info text variant</Text>
      <Text variant='game'>Game text variant</Text>
      <Text variant='subtle'>Subtle text variant</Text>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available text variants showing different semantic colors.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <div className='space-y-2'>
      <Text size='xs'>Extra small text (xs)</Text>
      <Text size='sm'>Small text (sm)</Text>
      <Text size='base'>Base text (base)</Text>
      <Text size='lg'>Large text (lg)</Text>
      <Text size='xl'>Extra large text (xl)</Text>
      <Text size='2xl'>2X large text (2xl)</Text>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Text size options from extra small to 2XL.',
      },
    },
  },
};

export const Weights: Story = {
  render: () => (
    <div className='space-y-2'>
      <Text weight='normal'>Normal weight text</Text>
      <Text weight='medium'>Medium weight text</Text>
      <Text weight='semibold'>Semibold weight text</Text>
      <Text weight='bold'>Bold weight text</Text>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Font weight options for different emphasis levels.',
      },
    },
  },
};

export const Alignment: Story = {
  render: () => (
    <div className='space-y-4 w-full'>
      <Text align='left'>Left aligned text content</Text>
      <Text align='center'>Center aligned text content</Text>
      <Text align='right'>Right aligned text content</Text>
      <Text align='justify'>
        Justified text content that spans multiple lines to demonstrate how text justification works
        with longer content that wraps across multiple lines in the container.
      </Text>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Text alignment options including justify for longer content.',
      },
    },
  },
};

export const Decorations: Story = {
  render: () => (
    <div className='space-y-2'>
      <Text decoration='none'>No decoration text</Text>
      <Text decoration='underline'>Underlined text</Text>
      <Text decoration='overline'>Overlined text</Text>
      <Text decoration='line-through'>Strikethrough text</Text>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Text decoration options for different text treatments.',
      },
    },
  },
};

export const Transforms: Story = {
  render: () => (
    <div className='space-y-2'>
      <Text transform='none'>Normal case text</Text>
      <Text transform='uppercase'>Uppercase text</Text>
      <Text transform='lowercase'>LOWERCASE TEXT</Text>
      <Text transform='capitalize'>capitalize each word</Text>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Text transformation options for different cases.',
      },
    },
  },
};

export const AsElements: Story = {
  render: () => (
    <div className='space-y-2'>
      <Text as='p'>Paragraph element</Text>
      <Text as='span'>Span element</Text>
      <Text as='label'>Label element</Text>
      <Text as='caption'>Caption element</Text>
      <Text as='strong'>Strong element</Text>
      <Text as='em'>Emphasis element</Text>
      <Text as='small'>Small element</Text>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different HTML elements while maintaining consistent styling.',
      },
    },
  },
};

export const Truncated: Story = {
  args: {
    children:
      'This is a very long text that will be truncated with an ellipsis when it exceeds the container width',
    truncate: true,
    className: 'w-48',
  },
  parameters: {
    docs: {
      description: {
        story: 'Text truncation with ellipsis for overflow content.',
      },
    },
  },
};

export const WithAnimation: Story = {
  args: {
    children: 'Animated text content',
    variant: 'primary',
    animate: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Text with mount animation enabled.',
      },
    },
  },
};

export const StatusMessages: Story = {
  render: () => (
    <div className='space-y-3 p-4 bg-background-secondary rounded-lg'>
      <Text variant='success' weight='medium'>
        ✓ Profile updated successfully
      </Text>
      <Text variant='warning' weight='medium'>
        ⚠ Please verify your email address
      </Text>
      <Text variant='error' weight='medium'>
        ✕ Failed to save changes
      </Text>
      <Text variant='info' weight='medium'>
        ⓘ New features are available
      </Text>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Text used for status messages and feedback.',
      },
    },
  },
};

export const GameInterface: Story = {
  render: () => (
    <div className='space-y-2 p-4 bg-background-tertiary rounded-lg'>
      <Text variant='game' weight='bold' size='lg'>
        Character Name
      </Text>
      <Text variant='accent' size='sm'>
        Level 5 Scoundrel
      </Text>
      <Text variant='secondary' size='sm'>
        Stress: 3/9
      </Text>
      <Text variant='muted' size='xs'>
        Last active: 2 hours ago
      </Text>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Text components used in game character interfaces.',
      },
    },
  },
};
