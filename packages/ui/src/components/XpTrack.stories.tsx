import type { Meta, StoryObj } from '@storybook/react';
import { XpTrack } from './XpTrack';
import { Button } from './Button';

const meta: Meta<typeof XpTrack> = {
  title: 'Game Components/XpTrack',
  component: XpTrack,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A FitD experience track: square boxes filled left-to-right, gold when earned (deliberately not the StressTracker danger palette). Used for character playbook/attribute tracks and the crew advancement track, so marking XP feels the same everywhere.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    current: { control: { type: 'range', min: 0, max: 8, step: 1 } },
    size: { control: { type: 'range', min: 1, max: 12, step: 1 } },
    interactive: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Playbook',
    current: 3,
    size: 8,
    interactive: true,
  },
};

export const FullWithAction: Story = {
  args: {
    label: 'Playbook',
    current: 8,
    size: 8,
    interactive: true,
    readyLabel: 'Full — ready to advance',
    action: (
      <Button variant='ember' size='sm'>
        Take advance
      </Button>
    ),
  },
};

export const AttributeTrack: Story = {
  args: {
    label: 'Insight',
    current: 4,
    size: 6,
    interactive: true,
    readyLabel: 'Full — ready to advance',
  },
};

export const CrewTrack: Story = {
  args: {
    label: 'Crew advancement',
    current: 5,
    size: 8,
    interactive: true,
    hint: 'Mark XP when the crew executes a successful operation or advances its long-term goals.',
  },
};

export const ReadOnly: Story = {
  args: {
    label: 'Playbook',
    current: 6,
    size: 8,
    interactive: false,
    hint: 'Another player’s sheet — marks visible, not editable.',
  },
};
