import type { Meta, StoryObj } from '@storybook/react';
import { Textarea } from './Textarea';

const meta: Meta<typeof Textarea> = {
  title: 'Components/Textarea',
  component: Textarea,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Multi-line text input sharing the Input variant system, with label, help text, and validation states.',
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
    resizable: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Background',
    placeholder: 'Where does your scoundrel come from?',
  },
};

export const WithHelpText: Story = {
  args: {
    label: 'Description',
    helpText: 'A sentence or two the table sees on your sheet.',
    placeholder: 'Scarred hands, a tailored coat two sizes too fine…',
  },
};

export const ValidationStates: Story = {
  render: () => (
    <div className='space-y-6 w-80 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Textarea label='Error' error='A description is required.' placeholder='Required field' />
      <Textarea label='Success' success='Looks good.' defaultValue='A quiet fixer with debts.' />
      <Textarea label='Warning' warning='Long descriptions get truncated on the card.' />
    </div>
  ),
};

export const FixedSize: Story = {
  args: {
    label: 'Notes',
    resizable: false,
    placeholder: 'Not resizable',
  },
};

export const Disabled: Story = {
  args: {
    label: 'Locked notes',
    disabled: true,
    defaultValue: 'Read-only for players.',
  },
};
