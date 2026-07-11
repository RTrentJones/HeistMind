import type { Meta, StoryObj } from '@storybook/react';
import { HarmTracker } from './HarmTracker';

const meta: Meta<typeof HarmTracker> = {
  title: 'Game Components/HarmTracker',
  component: HarmTracker,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Read-only FitD harm track: three levels (Severe / Moderate / Lesser) shown top-down with one box per allowed entry; filled boxes carry the harm description. Editing lives in the character editor.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const BITD_BOUNDS = { lesser: 2, moderate: 2, severe: 1 };

export const Empty: Story = {
  args: {
    harm: { lesser: [], moderate: [], severe: [] },
    bounds: BITD_BOUNDS,
  },
};

export const PartiallyHarmed: Story = {
  args: {
    harm: { lesser: ['Bruised'], moderate: ['Sprained ankle'], severe: [] },
    bounds: BITD_BOUNDS,
  },
};

export const FullTrack: Story = {
  args: {
    harm: {
      lesser: ['Bruised', 'Winded'],
      moderate: ['Sprained ankle', 'Concussion'],
      severe: ['Stabbed in the gut'],
    },
    bounds: BITD_BOUNDS,
  },
};

export const CustomBounds: Story = {
  args: {
    harm: { lesser: ['Rattled'], moderate: [], severe: [] },
    bounds: { lesser: 3, moderate: 2, severe: 2 },
  },
};
