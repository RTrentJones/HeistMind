import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Components/Select',
  component: Select,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'The design-system wrapper around a native <select>. Every dropdown gets a real associated <label> (or an explicit aria-label when the label is rendered elsewhere) and a shared token instead of a copy-pasted className.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    selectSize: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
    },
    hideLabel: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

const positionOptions = (
  <>
    <option value='controlled'>Controlled</option>
    <option value='risky'>Risky</option>
    <option value='desperate'>Desperate</option>
  </>
);

export const Default: Story = {
  args: {
    label: 'Position',
    defaultValue: 'risky',
    children: positionOptions,
  },
};

export const Sizes: Story = {
  render: () => (
    <div className='space-y-4 w-64 p-6 bg-background-secondary rounded-lg border border-border-primary'>
      <Select label='Small' selectSize='sm' defaultValue='risky'>
        {positionOptions}
      </Select>
      <Select label='Default' selectSize='default' defaultValue='risky'>
        {positionOptions}
      </Select>
      <Select label='Large' selectSize='lg' defaultValue='risky'>
        {positionOptions}
      </Select>
    </div>
  ),
};

export const WithError: Story = {
  args: {
    label: 'Effect',
    error: 'Pick an effect level before rolling.',
    children: (
      <>
        <option value=''>—</option>
        <option value='limited'>Limited</option>
        <option value='standard'>Standard</option>
        <option value='great'>Great</option>
      </>
    ),
  },
};

export const HiddenLabel: Story = {
  args: {
    label: 'Attribute',
    hideLabel: true,
    defaultValue: 'prowess',
    children: (
      <>
        <option value='insight'>Insight</option>
        <option value='prowess'>Prowess</option>
        <option value='resolve'>Resolve</option>
      </>
    ),
  },
};

export const Disabled: Story = {
  args: {
    label: 'Position',
    disabled: true,
    defaultValue: 'controlled',
    children: positionOptions,
  },
};
