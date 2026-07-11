import type { Meta, StoryObj } from '@storybook/react';
import { Clock } from './Clock';

const meta: Meta<typeof Clock> = {
  title: 'Game Components/Clock',
  component: Clock,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A FitD progress clock: a ring divided into segments, the first `filled` of which are lit. Presentation only — ticking is driven by the surrounding panel.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    segments: { control: { type: 'range', min: 1, max: 12, step: 1 } },
    filled: { control: { type: 'range', min: 0, max: 12, step: 1 } },
    size: { control: { type: 'range', min: 32, max: 160, step: 8 } },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    segments: 8,
    filled: 3,
    label: 'Alarm raised',
  },
};

export const StandardSizes: Story = {
  render: () => (
    <div className='flex items-end gap-6 p-6'>
      <Clock segments={4} filled={1} label='4-clock' />
      <Clock segments={6} filled={3} label='6-clock' />
      <Clock segments={8} filled={5} label='8-clock' />
      <Clock segments={12} filled={7} label='12-clock' />
    </div>
  ),
};

export const Complete: Story = {
  args: {
    segments: 6,
    filled: 6,
    label: 'Complete',
  },
};

export const Empty: Story = {
  args: {
    segments: 8,
    filled: 0,
    label: 'Not started',
  },
};

export const Large: Story = {
  args: {
    segments: 8,
    filled: 5,
    size: 144,
    label: 'Drive off the rival crew',
  },
};
