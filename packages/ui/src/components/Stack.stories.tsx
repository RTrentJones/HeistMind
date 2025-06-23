import type { Meta, StoryObj } from '@storybook/react';
import { Stack } from './Stack';

const meta: Meta<typeof Stack> = {
  title: 'Layout/Stack',
  component: Stack,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Flexible layout component for arranging children vertically or horizontally with consistent spacing.',
      },
    },
  },
  argTypes: {
    direction: {
      control: { type: 'select' },
      options: ['column', 'row', 'column-reverse', 'row-reverse'],
      description: 'Flex direction for arranging children',
    },
    gap: {
      control: { type: 'select' },
      options: ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl'],
      description: 'Space between stack items',
    },
    align: {
      control: { type: 'select' },
      options: ['start', 'center', 'end', 'stretch', 'baseline'],
      description: 'Cross-axis alignment',
    },
    justify: {
      control: { type: 'select' },
      options: ['start', 'center', 'end', 'between', 'around', 'evenly'],
      description: 'Main-axis alignment',
    },
    wrap: {
      control: { type: 'select' },
      options: ['nowrap', 'wrap', 'wrap-reverse'],
      description: 'Flex wrap behavior',
    },
    as: {
      control: { type: 'select' },
      options: ['div', 'section', 'article', 'nav', 'header', 'footer', 'main'],
      description: 'HTML element to render',
    },
    animateChildren: {
      control: { type: 'boolean' },
      description: 'Enable staggered animation for children',
    },
    staggerDelay: {
      control: { type: 'range', min: 0, max: 0.3, step: 0.05 },
      description: 'Delay between child animations',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample components for demonstrations
const SampleBox = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`p-3 bg-background-secondary border border-border-primary rounded text-center ${className}`}
  >
    {children}
  </div>
);

const SampleButton = ({ children }: { children: React.ReactNode }) => (
  <button className='px-4 py-2 bg-brand-primary text-white rounded hover:bg-brand-secondary transition-colors'>
    {children}
  </button>
);

export const Default: Story = {
  render: () => (
    <Stack>
      <SampleBox>Item 1</SampleBox>
      <SampleBox>Item 2</SampleBox>
      <SampleBox>Item 3</SampleBox>
    </Stack>
  ),
};

export const Directions: Story = {
  render: () => (
    <div className='space-y-8'>
      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Column (default)</h3>
        <Stack direction='column'>
          <SampleBox>First</SampleBox>
          <SampleBox>Second</SampleBox>
          <SampleBox>Third</SampleBox>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Row</h3>
        <Stack direction='row'>
          <SampleBox>First</SampleBox>
          <SampleBox>Second</SampleBox>
          <SampleBox>Third</SampleBox>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Column Reverse</h3>
        <Stack direction='column-reverse'>
          <SampleBox>First (shows last)</SampleBox>
          <SampleBox>Second</SampleBox>
          <SampleBox>Third (shows first)</SampleBox>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Row Reverse</h3>
        <Stack direction='row-reverse'>
          <SampleBox>First (shows last)</SampleBox>
          <SampleBox>Second</SampleBox>
          <SampleBox>Third (shows first)</SampleBox>
        </Stack>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different direction options for arranging stack items.',
      },
    },
  },
};

export const Gaps: Story = {
  render: () => (
    <div className='space-y-8'>
      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>No Gap</h3>
        <Stack gap='none'>
          <SampleBox>Item 1</SampleBox>
          <SampleBox>Item 2</SampleBox>
          <SampleBox>Item 3</SampleBox>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Small Gap</h3>
        <Stack gap='sm'>
          <SampleBox>Item 1</SampleBox>
          <SampleBox>Item 2</SampleBox>
          <SampleBox>Item 3</SampleBox>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Large Gap</h3>
        <Stack gap='lg'>
          <SampleBox>Item 1</SampleBox>
          <SampleBox>Item 2</SampleBox>
          <SampleBox>Item 3</SampleBox>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Extra Large Gap</h3>
        <Stack gap='2xl'>
          <SampleBox>Item 1</SampleBox>
          <SampleBox>Item 2</SampleBox>
          <SampleBox>Item 3</SampleBox>
        </Stack>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different gap sizes between stack items.',
      },
    },
  },
};

export const Alignment: Story = {
  render: () => (
    <div className='space-y-8'>
      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Align Start</h3>
        <Stack
          direction='row'
          align='start'
          className='min-h-[100px] bg-background-tertiary rounded p-4'
        >
          <SampleBox className='h-16'>Short</SampleBox>
          <SampleBox className='h-20'>Medium</SampleBox>
          <SampleBox className='h-12'>Tall</SampleBox>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Align Center</h3>
        <Stack
          direction='row'
          align='center'
          className='min-h-[100px] bg-background-tertiary rounded p-4'
        >
          <SampleBox className='h-16'>Short</SampleBox>
          <SampleBox className='h-20'>Medium</SampleBox>
          <SampleBox className='h-12'>Tall</SampleBox>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Align Stretch</h3>
        <Stack
          direction='row'
          align='stretch'
          className='min-h-[100px] bg-background-tertiary rounded p-4'
        >
          <SampleBox>Auto Height</SampleBox>
          <SampleBox>Auto Height</SampleBox>
          <SampleBox>Auto Height</SampleBox>
        </Stack>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Cross-axis alignment options for stack items.',
      },
    },
  },
};

export const Justification: Story = {
  render: () => (
    <div className='space-y-8'>
      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Justify Start</h3>
        <Stack direction='row' justify='start' className='bg-background-tertiary rounded p-4'>
          <SampleBox>Item 1</SampleBox>
          <SampleBox>Item 2</SampleBox>
          <SampleBox>Item 3</SampleBox>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Justify Center</h3>
        <Stack direction='row' justify='center' className='bg-background-tertiary rounded p-4'>
          <SampleBox>Item 1</SampleBox>
          <SampleBox>Item 2</SampleBox>
          <SampleBox>Item 3</SampleBox>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Justify Between</h3>
        <Stack direction='row' justify='between' className='bg-background-tertiary rounded p-4'>
          <SampleBox>Item 1</SampleBox>
          <SampleBox>Item 2</SampleBox>
          <SampleBox>Item 3</SampleBox>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Justify Evenly</h3>
        <Stack direction='row' justify='evenly' className='bg-background-tertiary rounded p-4'>
          <SampleBox>Item 1</SampleBox>
          <SampleBox>Item 2</SampleBox>
          <SampleBox>Item 3</SampleBox>
        </Stack>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Main-axis justification options for stack items.',
      },
    },
  },
};

export const Wrapping: Story = {
  render: () => (
    <div className='space-y-8'>
      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>No Wrap (default)</h3>
        <Stack direction='row' wrap='nowrap' className='bg-background-tertiary rounded p-4 w-80'>
          <SampleBox className='min-w-[100px]'>Item 1</SampleBox>
          <SampleBox className='min-w-[100px]'>Item 2</SampleBox>
          <SampleBox className='min-w-[100px]'>Item 3</SampleBox>
          <SampleBox className='min-w-[100px]'>Item 4</SampleBox>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Wrap</h3>
        <Stack direction='row' wrap='wrap' className='bg-background-tertiary rounded p-4 w-80'>
          <SampleBox className='min-w-[100px]'>Item 1</SampleBox>
          <SampleBox className='min-w-[100px]'>Item 2</SampleBox>
          <SampleBox className='min-w-[100px]'>Item 3</SampleBox>
          <SampleBox className='min-w-[100px]'>Item 4</SampleBox>
        </Stack>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Flex wrap behavior when items exceed container width.',
      },
    },
  },
};

export const WithAnimation: Story = {
  render: () => (
    <Stack animateChildren staggerDelay={0.1}>
      <SampleBox>Animated Item 1</SampleBox>
      <SampleBox>Animated Item 2</SampleBox>
      <SampleBox>Animated Item 3</SampleBox>
      <SampleBox>Animated Item 4</SampleBox>
    </Stack>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Stack with staggered animation for child elements.',
      },
    },
  },
};

export const ButtonGroups: Story = {
  render: () => (
    <div className='space-y-6'>
      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>
          Horizontal Button Group
        </h3>
        <Stack direction='row' gap='sm'>
          <SampleButton>Primary</SampleButton>
          <SampleButton>Secondary</SampleButton>
          <SampleButton>Tertiary</SampleButton>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>
          Vertical Button Group
        </h3>
        <Stack direction='column' gap='sm' className='w-40'>
          <SampleButton>Option 1</SampleButton>
          <SampleButton>Option 2</SampleButton>
          <SampleButton>Option 3</SampleButton>
        </Stack>
      </div>

      <div>
        <h3 className='text-lg font-semibold mb-4 text-foreground-primary'>Centered Actions</h3>
        <Stack direction='row' gap='md' justify='center'>
          <button className='px-6 py-2 bg-transparent border border-border-primary text-foreground-primary rounded hover:bg-background-secondary transition-colors'>
            Cancel
          </button>
          <SampleButton>Confirm</SampleButton>
        </Stack>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Button groups and action layouts using Stack.',
      },
    },
  },
};

export const FormLayout: Story = {
  render: () => (
    <div className='max-w-md'>
      <Stack gap='lg'>
        <div>
          <h2 className='text-xl font-bold text-foreground-primary mb-2'>Create Character</h2>
          <p className='text-foreground-secondary text-sm'>
            Fill in the details for your new character.
          </p>
        </div>

        <Stack gap='md'>
          <div>
            <label className='block text-sm font-medium text-foreground-primary mb-1'>
              Character Name
            </label>
            <input
              type='text'
              className='w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary'
              placeholder='Enter character name'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-foreground-primary mb-1'>
              Character Class
            </label>
            <select className='w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary'>
              <option>Select a class</option>
              <option>Lurk</option>
              <option>Cutter</option>
              <option>Leech</option>
              <option>Spider</option>
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-foreground-primary mb-1'>
              Background
            </label>
            <textarea
              className='w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary'
              rows={3}
              placeholder='Character background and history'
            />
          </div>
        </Stack>

        <Stack direction='row' gap='sm' justify='end'>
          <button className='px-4 py-2 text-foreground-secondary border border-border-primary rounded hover:bg-background-secondary transition-colors'>
            Cancel
          </button>
          <SampleButton>Create Character</SampleButton>
        </Stack>
      </Stack>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Form layout using nested stacks for organization.',
      },
    },
  },
};

export const CharacterCard: Story = {
  render: () => (
    <div className='max-w-sm'>
      <div className='p-6 bg-background-secondary border border-border-primary rounded-lg'>
        <Stack gap='md'>
          <Stack direction='row' gap='md' align='center'>
            <div className='w-16 h-16 bg-brand-primary rounded-full flex items-center justify-center text-white text-xl font-bold'>
              A
            </div>
            <Stack gap='xs'>
              <h3 className='text-lg font-semibold text-foreground-primary'>Aria Shadowbane</h3>
              <p className='text-sm text-foreground-secondary'>Lurk • Level 3</p>
            </Stack>
          </Stack>

          <Stack gap='sm'>
            <Stack direction='row' justify='between' align='center'>
              <span className='text-sm text-foreground-secondary'>Stress</span>
              <span className='text-sm font-medium text-foreground-primary'>2/9</span>
            </Stack>

            <Stack direction='row' justify='between' align='center'>
              <span className='text-sm text-foreground-secondary'>Experience</span>
              <span className='text-sm font-medium text-foreground-primary'>5/8</span>
            </Stack>

            <Stack direction='row' justify='between' align='center'>
              <span className='text-sm text-foreground-secondary'>Coin</span>
              <span className='text-sm font-medium text-foreground-primary'>12</span>
            </Stack>
          </Stack>

          <Stack direction='row' gap='sm'>
            <button className='flex-1 px-3 py-2 text-sm bg-brand-primary text-white rounded hover:bg-brand-secondary transition-colors'>
              Edit
            </button>
            <button className='flex-1 px-3 py-2 text-sm border border-border-primary text-foreground-primary rounded hover:bg-background-tertiary transition-colors'>
              View Sheet
            </button>
          </Stack>
        </Stack>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Character card layout using nested stacks for complex arrangements.',
      },
    },
  },
};
