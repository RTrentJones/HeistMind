import type { Meta, StoryObj } from '@storybook/react';
import { Heading } from './Heading';

const meta: Meta<typeof Heading> = {
  title: 'Typography/Heading',
  component: Heading,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Semantic heading component with design system variants and accessibility features.',
      },
    },
  },
  argTypes: {
    level: {
      control: { type: 'select' },
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      description: 'Semantic heading level',
    },
    variant: {
      control: { type: 'select' },
      options: [
        'default',
        'primary',
        'secondary',
        'muted',
        'accent',
        'gradient',
        'hero',
        'game',
        'danger',
        'success',
        'warning',
      ],
      description: 'Visual style variant',
    },
    align: {
      control: { type: 'select' },
      options: ['left', 'center', 'right'],
      description: 'Text alignment',
    },
    spacing: {
      control: { type: 'select' },
      options: ['tight', 'normal', 'relaxed'],
      description: 'Line height spacing',
    },
    as: {
      control: { type: 'select' },
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div', 'span'],
      description: 'Override HTML element',
    },
    animate: {
      control: { type: 'boolean' },
      description: 'Enable mount animation',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Default Heading',
    level: 'h2',
    variant: 'default',
  },
};

export const AllLevels: Story = {
  render: () => (
    <div className='space-y-4'>
      <Heading level='h1'>Heading Level 1</Heading>
      <Heading level='h2'>Heading Level 2</Heading>
      <Heading level='h3'>Heading Level 3</Heading>
      <Heading level='h4'>Heading Level 4</Heading>
      <Heading level='h5'>Heading Level 5</Heading>
      <Heading level='h6'>Heading Level 6</Heading>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All semantic heading levels showing the typography scale.',
      },
    },
  },
};

export const Variants: Story = {
  render: () => (
    <div className='space-y-4'>
      <Heading variant='default'>Default Variant</Heading>
      <Heading variant='primary'>Primary Variant</Heading>
      <Heading variant='secondary'>Secondary Variant</Heading>
      <Heading variant='muted'>Muted Variant</Heading>
      <Heading variant='accent'>Accent Variant</Heading>
      <Heading variant='gradient'>Gradient Variant</Heading>
      <Heading variant='hero'>Hero Variant</Heading>
      <Heading variant='game'>Game Variant</Heading>
      <Heading variant='danger'>Danger Variant</Heading>
      <Heading variant='success'>Success Variant</Heading>
      <Heading variant='warning'>Warning Variant</Heading>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available visual variants showing different color treatments.',
      },
    },
  },
};

export const Alignment: Story = {
  render: () => (
    <div className='space-y-4 w-full'>
      <Heading align='left'>Left Aligned Heading</Heading>
      <Heading align='center'>Center Aligned Heading</Heading>
      <Heading align='right'>Right Aligned Heading</Heading>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Text alignment options for headings.',
      },
    },
  },
};

export const Spacing: Story = {
  render: () => (
    <div className='space-y-6'>
      <div>
        <Heading spacing='tight'>Tight Line Height</Heading>
        <p className='text-sm text-foreground-muted'>This heading has tight spacing</p>
      </div>
      <div>
        <Heading spacing='normal'>Normal Line Height</Heading>
        <p className='text-sm text-foreground-muted'>This heading has normal spacing</p>
      </div>
      <div>
        <Heading spacing='relaxed'>Relaxed Line Height</Heading>
        <p className='text-sm text-foreground-muted'>This heading has relaxed spacing</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Line height spacing options for different use cases.',
      },
    },
  },
};

export const HeroSection: Story = {
  render: () => (
    <div className='text-center space-y-4 py-16'>
      <Heading level='h1' variant='hero' align='center' animate>
        Welcome to HeistMind
      </Heading>
      <Heading level='h2' variant='secondary' align='center'>
        The ultimate character management platform
      </Heading>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example hero section with animated primary heading and secondary subtitle.',
      },
    },
  },
};

export const WithAnimation: Story = {
  args: {
    children: 'Animated Heading',
    level: 'h2',
    variant: 'primary',
    animate: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Heading with mount animation enabled.',
      },
    },
  },
};

export const CustomElement: Story = {
  args: {
    children: 'Div with H1 Styling',
    level: 'h1',
    as: 'div',
    variant: 'gradient',
  },
  parameters: {
    docs: {
      description: {
        story: 'Using a different HTML element while maintaining heading appearance.',
      },
    },
  },
};

export const GameThemed: Story = {
  render: () => (
    <div className='space-y-4 p-6 bg-background-tertiary rounded-lg'>
      <Heading level='h2' variant='game'>
        Character Sheet
      </Heading>
      <Heading level='h3' variant='accent'>
        Skills & Abilities
      </Heading>
      <Heading level='h4' variant='secondary'>
        Equipment
      </Heading>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Game-themed headings for character management interfaces.',
      },
    },
  },
};
