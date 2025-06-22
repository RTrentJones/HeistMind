import type { Meta, StoryObj } from '@storybook/react';
import { Input, Textarea } from './Input';
import { Search, User, Mail, Lock, Eye, Calendar, DollarSign } from 'lucide-react';

const meta: Meta<typeof Input> = {
  title: 'Components/Input',
  component: Input,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A flexible input component with multiple variants, states, and built-in validation styling. Includes support for icons, password toggle, and Framer Motion animations.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'glass', 'neon', 'ember', 'steel', 'ghost'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'xl'],
    },
    state: {
      control: 'select',
      options: ['default', 'error', 'success', 'warning'],
    },
    iconPosition: {
      control: 'select',
      options: ['left', 'right'],
    },
    showPasswordToggle: {
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
    placeholder: 'Enter your character name...',
    label: 'Character Name',
  },
};

export const Variants: Story = {
  render: () => (
    <div className='space-y-6 w-80 p-6 bg-background-primary rounded-lg'>
      <Input variant='default' placeholder='Default input' label='Default' />
      <Input variant='glass' placeholder='Glass morphism input' label='Glass' />
      <Input variant='neon' placeholder='Neon themed input' label='Neon' />
      <Input variant='ember' placeholder='Ember themed input' label='Ember' />
      <Input variant='steel' placeholder='Steel themed input' label='Steel' />
      <Input variant='ghost' placeholder='Ghost input' label='Ghost' />
    </div>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <div className='space-y-6 w-80 p-6 bg-background-primary rounded-lg'>
      <Input
        icon={<User className='w-4 h-4' />}
        placeholder='Character name'
        label='Character Name'
        iconPosition='left'
      />
      <Input
        icon={<Mail className='w-4 h-4' />}
        placeholder='email@example.com'
        label='Email Address'
        iconPosition='left'
        type='email'
      />
      <Input
        icon={<Search className='w-4 h-4' />}
        placeholder='Search characters...'
        label='Search'
        iconPosition='right'
        variant='glass'
      />
      <Input
        icon={<DollarSign className='w-4 h-4' />}
        placeholder='Enter coin amount'
        label='Coin'
        iconPosition='left'
        variant='ember'
        type='number'
      />
    </div>
  ),
};

export const PasswordInput: Story = {
  render: () => (
    <div className='space-y-6 w-80 p-6 bg-background-primary rounded-lg'>
      <Input type='password' placeholder='Enter password' label='Password' showPasswordToggle />
      <Input
        type='password'
        placeholder='Confirm password'
        label='Confirm Password'
        showPasswordToggle
        variant='neon'
        icon={<Lock className='w-4 h-4' />}
      />
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className='space-y-6 w-80 p-6 bg-background-primary rounded-lg'>
      <Input placeholder='Default state' label='Default' defaultValue='Normal input' />
      <Input
        placeholder='Error state'
        label='Error State'
        error='This field is required'
        defaultValue='Invalid input'
      />
      <Input
        placeholder='Success state'
        label='Success State'
        success='Character name is available'
        defaultValue='Shadows McKenzie'
      />
      <Input
        placeholder='Warning state'
        label='Warning State'
        warning='Character name already exists in your crew'
        defaultValue='Common Name'
      />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className='space-y-6 w-80 p-6 bg-background-primary rounded-lg'>
      <Input
        size='sm'
        placeholder='Small input'
        label='Small'
        icon={<User className='w-3 h-3' />}
      />
      <Input
        size='default'
        placeholder='Default size'
        label='Default'
        icon={<User className='w-4 h-4' />}
      />
      <Input
        size='lg'
        placeholder='Large input'
        label='Large'
        icon={<User className='w-5 h-5' />}
      />
      <Input
        size='xl'
        placeholder='Extra large input'
        label='Extra Large'
        icon={<User className='w-6 h-6' />}
      />
    </div>
  ),
};

export const GameThemed: Story = {
  render: () => (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-background-primary rounded-lg'>
      <div className='space-y-4'>
        <h3 className='text-lg font-semibold text-purple-400'>Character Creation</h3>
        <Input
          variant='neon'
          placeholder='Enter character name'
          label='Character Name'
          icon={<User className='w-4 h-4' />}
        />
        <Input
          variant='ember'
          placeholder='Select playbook'
          label='Playbook'
          icon={<Calendar className='w-4 h-4' />}
        />
        <Input
          variant='steel'
          type='number'
          placeholder='0'
          label='Starting Coin'
          icon={<DollarSign className='w-4 h-4' />}
          min='0'
          max='4'
        />
      </div>

      <div className='space-y-4'>
        <h3 className='text-lg font-semibold text-blue-400'>Crew Information</h3>
        <Input variant='glass' placeholder='Enter crew name' label='Crew Name' />
        <Input variant='ghost' placeholder='Describe your crew' label='Crew Description' />
        <Input
          variant='default'
          type='number'
          placeholder='0'
          label='Reputation'
          min='0'
          max='12'
        />
      </div>
    </div>
  ),
};

export const DisabledState: Story = {
  render: () => (
    <div className='space-y-6 w-80 p-6 bg-background-primary rounded-lg'>
      <Input
        disabled
        placeholder='Disabled input'
        label='Disabled Field'
        defaultValue='Cannot edit this'
      />
      <Input
        disabled
        variant='glass'
        placeholder='Disabled glass input'
        label='Disabled Glass'
        icon={<User className='w-4 h-4' />}
      />
    </div>
  ),
};

export const TextareaStory: Story = {
  render: () => (
    <div className='space-y-6 w-80 p-6 bg-background-primary rounded-lg'>
      <Textarea placeholder='Enter character background...' label='Character Background' rows={4} />
      <Textarea
        variant='glass'
        placeholder='Describe the heist plan...'
        label='Heist Details'
        rows={3}
      />
      <Textarea
        variant='neon'
        placeholder='Character notes'
        label='Notes'
        rows={6}
        error='Background story is required'
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Textarea component with the same styling options as Input.',
      },
    },
  },
};

export const Interactive: Story = {
  args: {
    variant: 'neon',
    size: 'lg',
    placeholder: 'Type to see animations...',
    label: 'Interactive Input',
    icon: <Search className='w-5 h-5' />,
  },
  parameters: {
    docs: {
      description: {
        story: 'Input with focus animations and interactive states.',
      },
    },
  },
};
