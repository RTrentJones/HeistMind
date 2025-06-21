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
    <div className='flex flex-wrap gap-4 p-6 bg-slate-900 rounded-lg'>
      <Button variant='default'>Default</Button>
      <Button variant='destructive'>Destructive</Button>
      <Button variant='outline'>Outline</Button>
      <Button variant='secondary'>Secondary</Button>
      <Button variant='ghost'>Ghost</Button>
      <Button variant='link'>Link</Button>
    </div>
  ),
};

export const GameThemed: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4 p-6 bg-slate-900 rounded-lg'>
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
};

export const Sizes: Story = {
  render: () => (
    <div className='flex items-center gap-4 p-6 bg-slate-900 rounded-lg'>
      <Button size='sm'>Small</Button>
      <Button size='default'>Default</Button>
      <Button size='lg'>Large</Button>
      <Button size='xl'>Extra Large</Button>
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4 p-6 bg-slate-900 rounded-lg'>
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
    <div className='flex gap-4 p-6 bg-slate-900 rounded-lg'>
      <Button size='icon-sm' variant='ghost'>
        <Eye className='w-4 h-4' />
      </Button>
      <Button size='icon' variant='outline'>
        <Sword className='w-4 h-4' />
      </Button>
      <Button size='icon-lg' variant='ember'>
        <Shield className='w-4 h-4' />
      </Button>
    </div>
  ),
};

export const LoadingStates: Story = {
  render: () => (
    <div className='flex flex-wrap gap-4 p-6 bg-slate-900 rounded-lg'>
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
    <div className='flex flex-wrap gap-4 p-6 bg-slate-900 rounded-lg'>
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
