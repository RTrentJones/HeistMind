import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipProvider, StressTooltip, SkillTooltip, ActionTooltip } from './Tooltip';
import { Button } from './Button';
import { Badge } from './Badge';
import { HelpCircle, Info, AlertCircle, Star, Zap, Shield } from 'lucide-react';

const meta: Meta<typeof Tooltip> = {
  title: 'Components/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A flexible tooltip component built on Radix UI with game-themed variants and specialized tooltips for HeistMind character sheets, skills, and actions.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className='p-20'>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'dark', 'light', 'glass', 'ember', 'steel', 'crimson'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
    },
    side: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
    },
    delayDuration: {
      control: 'number',
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
    content: 'This is a helpful tooltip',
    children: (
      <Button variant='outline'>
        <HelpCircle className='w-4 h-4' />
        Hover me
      </Button>
    ),
  },
};

export const Variants: Story = {
  render: () => (
    <TooltipProvider>
      <div className='flex flex-wrap gap-4 p-6 bg-background-primary rounded-lg'>
        <Tooltip variant='default' content='Default tooltip'>
          <Button size='sm'>Default</Button>
        </Tooltip>

        <Tooltip variant='dark' content='Dark themed tooltip'>
          <Button size='sm' variant='secondary'>
            Dark
          </Button>
        </Tooltip>

        <Tooltip variant='light' content='Light themed tooltip'>
          <Button size='sm' variant='ghost'>
            Light
          </Button>
        </Tooltip>

        <Tooltip variant='glass' content='Glass morphism tooltip with backdrop blur'>
          <Button size='sm' variant='glass'>
            Glass
          </Button>
        </Tooltip>

        <Tooltip variant='ember' content='Ember themed tooltip'>
          <Button size='sm' variant='ember'>
            Ember
          </Button>
        </Tooltip>

        <Tooltip variant='steel' content='Steel themed tooltip'>
          <Button size='sm' variant='steel'>
            Steel
          </Button>
        </Tooltip>

        <Tooltip variant='crimson' content='Crimson themed tooltip'>
          <Button size='sm' variant='crimson'>
            Crimson
          </Button>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const Sizes: Story = {
  render: () => (
    <TooltipProvider>
      <div className='flex gap-4 p-6 bg-background-primary rounded-lg'>
        <Tooltip size='sm' content='Small tooltip with limited text' variant='glass'>
          <Button size='sm'>Small</Button>
        </Tooltip>

        <Tooltip
          size='default'
          content='Default size tooltip with moderate amount of content'
          variant='glass'
        >
          <Button>Default</Button>
        </Tooltip>

        <Tooltip
          size='lg'
          content='Large tooltip that can contain more detailed information and explanations about the feature or element'
          variant='glass'
        >
          <Button size='lg'>Large</Button>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const Positioning: Story = {
  render: () => (
    <TooltipProvider>
      <div className='grid grid-cols-3 gap-8 place-items-center p-6 bg-background-primary rounded-lg'>
        <div></div>
        <Tooltip side='top' content='Tooltip above' variant='ember'>
          <Button>Top</Button>
        </Tooltip>
        <div></div>

        <Tooltip side='left' content='Tooltip to the left' variant='steel'>
          <Button>Left</Button>
        </Tooltip>
        <div className='text-white text-sm'>Hover buttons to see tooltip positioning</div>
        <Tooltip side='right' content='Tooltip to the right' variant='steel'>
          <Button>Right</Button>
        </Tooltip>

        <div></div>
        <Tooltip side='bottom' content='Tooltip below' variant='ember'>
          <Button>Bottom</Button>
        </Tooltip>
        <div></div>
      </div>
    </TooltipProvider>
  ),
};

export const GameSpecific: Story = {
  render: () => (
    <TooltipProvider>
      <div className='space-y-6 p-6 bg-background-primary rounded-lg'>
        <div className='space-y-4'>
          <h3 className='text-lg font-semibold text-purple-400'>Character Tooltips</h3>

          <div className='flex flex-wrap gap-3'>
            <StressTooltip
              current={3}
              max={9}
              consequences={['Gain trauma at 9 stress', 'Become lost or broken']}
            >
              <Badge variant='stress-medium'>Stress: 3/9</Badge>
            </StressTooltip>

            <StressTooltip
              current={8}
              max={9}
              consequences={['One more stress = trauma!', 'Consider resistance rolls']}
            >
              <Badge variant='stress-critical'>Critical: 8/9</Badge>
            </StressTooltip>
          </div>
        </div>

        <div className='space-y-4'>
          <h3 className='text-lg font-semibold text-blue-400'>Skill Tooltips</h3>

          <div className='flex flex-wrap gap-3'>
            <SkillTooltip
              name='Prowl'
              level={3}
              description='Move stealthily and avoid detection. Essential for infiltration and evasion.'
              examples={['Sneak past guards', 'Move silently through shadows', 'Hide from patrols']}
            >
              <Badge variant='expert' icon={<Star className='w-3 h-3' />}>
                Prowl (3)
              </Badge>
            </SkillTooltip>

            <SkillTooltip
              name='Finesse'
              level={2}
              description='Perform precise manipulation with dexterity and grace.'
              examples={['Pick locks', 'Disable alarms', 'Perform sleight of hand']}
            >
              <Badge variant='trained'>Finesse (2)</Badge>
            </SkillTooltip>
          </div>
        </div>

        <div className='space-y-4'>
          <h3 className='text-lg font-semibold text-red-400'>Action Tooltips</h3>

          <div className='flex flex-wrap gap-3'>
            <ActionTooltip
              name='Prowl'
              description='Move stealthily past the guards to reach the vault.'
              position='Risky'
              effect='Standard'
              risk='medium'
            >
              <Button variant='steel' size='sm'>
                <Shield className='w-3 h-3' />
                Prowl
              </Button>
            </ActionTooltip>

            <ActionTooltip
              name='Finesse'
              description='Attempt to pick the complex lock mechanism.'
              position='Controlled'
              effect='Great'
              risk='low'
            >
              <Button variant='ember' size='sm'>
                <Zap className='w-3 h-3' />
                Finesse
              </Button>
            </ActionTooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  ),
};

export const WithIcons: Story = {
  render: () => (
    <TooltipProvider>
      <div className='flex gap-4 p-6 bg-background-primary rounded-lg'>
        <Tooltip content='Get help with this feature' variant='glass'>
          <Button variant='ghost' size='icon'>
            <HelpCircle className='w-4 h-4' />
          </Button>
        </Tooltip>

        <Tooltip content='Important information about this setting' variant='ember'>
          <Button variant='ghost' size='icon'>
            <Info className='w-4 h-4' />
          </Button>
        </Tooltip>

        <Tooltip content='Warning: This action cannot be undone' variant='crimson'>
          <Button variant='ghost' size='icon'>
            <AlertCircle className='w-4 h-4' />
          </Button>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};

export const DelayVariations: Story = {
  render: () => (
    <div className='flex gap-4 p-6 bg-background-primary rounded-lg'>
      <Tooltip content='Instant tooltip (0ms delay)' delayDuration={0} variant='glass'>
        <Button size='sm'>Instant</Button>
      </Tooltip>

      <Tooltip content='Quick tooltip (100ms delay)' delayDuration={100} variant='glass'>
        <Button size='sm'>Quick</Button>
      </Tooltip>

      <Tooltip content='Normal tooltip (300ms delay)' delayDuration={300} variant='glass'>
        <Button size='sm'>Normal</Button>
      </Tooltip>

      <Tooltip content='Slow tooltip (800ms delay)' delayDuration={800} variant='glass'>
        <Button size='sm'>Slow</Button>
      </Tooltip>
    </div>
  ),
};

export const ComplexContent: Story = {
  render: () => (
    <div className='p-6 bg-background-primary rounded-lg'>
      <Tooltip
        variant='glass'
        size='lg'
        content={
          <div className='space-y-3'>
            <div className='font-semibold text-purple-300'>The Cutter</div>
            <div className='text-sm space-y-2'>
              <p>A fighter who specializes in violence and intimidation.</p>
              <div className='border-t border-white/20 pt-2'>
                <div className='font-medium text-xs text-purple-200'>Starting Actions:</div>
                <ul className='text-xs mt-1 space-y-0.5'>
                  <li>• Skirmish: Fight with weapons</li>
                  <li>• Hunt: Track and pursue</li>
                  <li>• Wreck: Smash and destroy</li>
                </ul>
              </div>
              <div className='border-t border-white/20 pt-2'>
                <div className='font-medium text-xs text-purple-200'>Special Ability:</div>
                <p className='text-xs mt-1'>Battleborn - Push yourself for +1d on Skirmish rolls</p>
              </div>
            </div>
          </div>
        }
      >
        <Button variant='neon'>The Cutter Playbook</Button>
      </Tooltip>
    </div>
  ),
};

export const DisabledTooltip: Story = {
  args: {
    content: 'This tooltip is disabled',
    disabled: true,
    children: <Button>No tooltip when disabled</Button>,
  },
};
