import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { User, Shield, Sword, Crown, Target } from 'lucide-react';

const meta: Meta<typeof Card> = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A flexible card component with multiple variants including glass morphism, neumorphic designs, and game-themed styling perfect for character sheets and game interfaces.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: [
        'default',
        'glass',
        'elevated',
        'outline',
        'gradient',
        'neumorphic',
        'character',
        'danger',
        'success',
      ],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg', 'xl'],
    },
    interactive: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Character Profile</CardTitle>
          <CardDescription>View and manage your character's details and abilities.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-muted-foreground'>
            This is the card content area where you can place any components or information.
          </p>
        </CardContent>
        <CardFooter>
          <Button size='sm'>Edit Character</Button>
        </CardFooter>
      </>
    ),
  },
};

export const Variants: Story = {
  render: () => (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-slate-900 min-h-screen'>
      <Card variant='default'>
        <CardHeader>
          <CardTitle>Default</CardTitle>
          <CardDescription>Standard card styling</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Basic card with standard styling and hover effects.</p>
        </CardContent>
      </Card>

      <Card variant='glass'>
        <CardHeader>
          <CardTitle>Glass</CardTitle>
          <CardDescription>Glass morphism effect</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Translucent card with backdrop blur for modern aesthetics.</p>
        </CardContent>
      </Card>

      <Card variant='elevated'>
        <CardHeader>
          <CardTitle>Elevated</CardTitle>
          <CardDescription>Enhanced shadow depth</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Elevated card with pronounced shadows and lift effect.</p>
        </CardContent>
      </Card>

      <Card variant='outline'>
        <CardHeader>
          <CardTitle>Outline</CardTitle>
          <CardDescription>Outlined with glow effect</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Transparent card with colored borders and glow on hover.</p>
        </CardContent>
      </Card>

      <Card variant='gradient'>
        <CardHeader>
          <CardTitle>Gradient</CardTitle>
          <CardDescription>Gradient background</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Card with subtle gradient background for visual depth.</p>
        </CardContent>
      </Card>

      <Card variant='neumorphic'>
        <CardHeader>
          <CardTitle>Neumorphic</CardTitle>
          <CardDescription>Soft embossed effect</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Neumorphic design with soft shadow insets and raises.</p>
        </CardContent>
      </Card>
    </div>
  ),
};

export const CharacterCard: Story = {
  render: () => (
    <div className='max-w-md bg-slate-900 p-6'>
      <Card variant='character' interactive>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center'>
              <User className='w-6 h-6 text-purple-400' />
            </div>
            <div>
              <CardTitle variant='gradient'>Shadows McKenzie</CardTitle>
              <CardDescription>Lurk • Veteran</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-3 gap-4 mb-4'>
            <div className='text-center'>
              <div className='text-2xl font-bold text-purple-400'>3</div>
              <div className='text-xs text-muted-foreground'>Prowl</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-blue-400'>2</div>
              <div className='text-xs text-muted-foreground'>Survey</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-green-400'>4</div>
              <div className='text-xs text-muted-foreground'>Finesse</div>
            </div>
          </div>
          <div className='flex items-center gap-2 text-sm'>
            <Shield className='w-4 h-4 text-blue-400' />
            <span>Stress: 2/9</span>
          </div>
        </CardContent>
        <CardFooter className='gap-2'>
          <Button size='sm' variant='ember'>
            <Sword className='w-4 h-4' />
            Actions
          </Button>
          <Button size='sm' variant='outline'>
            <Target className='w-4 h-4' />
            Items
          </Button>
        </CardFooter>
      </Card>
    </div>
  ),
};

export const GameThemed: Story = {
  render: () => (
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-900'>
      <Card variant='character'>
        <CardHeader>
          <CardTitle variant='gradient'>Heist Planning</CardTitle>
          <CardDescription>Plan your next score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Crown className='w-4 h-4 text-yellow-400' />
              <span className='text-sm'>Target: The Doskvol Bank</span>
            </div>
            <div className='flex items-center gap-2'>
              <Target className='w-4 h-4 text-red-400' />
              <span className='text-sm'>Security Level: High</span>
            </div>
            <div className='flex items-center gap-2'>
              <Shield className='w-4 h-4 text-blue-400' />
              <span className='text-sm'>Crew Reputation: 4</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant='ember'>Start Heist</Button>
        </CardFooter>
      </Card>

      <Card variant='danger'>
        <CardHeader>
          <CardTitle variant='crimson'>Danger Zone</CardTitle>
          <CardDescription>High-risk situation detected</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-red-300'>
            The Bluecoats are closing in. Your crew needs to make a quick escape or face the
            consequences.
          </p>
        </CardContent>
        <CardFooter className='gap-2'>
          <Button variant='destructive'>Fight</Button>
          <Button variant='outline'>Flee</Button>
        </CardFooter>
      </Card>

      <Card variant='success'>
        <CardHeader>
          <CardTitle>Score Complete</CardTitle>
          <CardDescription>Mission accomplished</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm text-green-300'>
            The heist was a success! Your crew has gained reputation and coin.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant='secondary'>Collect Rewards</Button>
        </CardFooter>
      </Card>

      <Card variant='glass' interactive>
        <CardHeader>
          <CardTitle>Crew Status</CardTitle>
          <CardDescription>Current crew information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-2'>
            <div className='flex justify-between'>
              <span className='text-sm'>Heat</span>
              <span className='text-sm font-medium'>3/9</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm'>Coin</span>
              <span className='text-sm font-medium'>8</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-sm'>Rep</span>
              <span className='text-sm font-medium'>5</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className='space-y-6 p-6 bg-slate-900'>
      <Card size='sm'>
        <CardHeader>
          <CardTitle>Small Card</CardTitle>
          <CardDescription>Compact size for tight spaces</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Small card content</p>
        </CardContent>
      </Card>

      <Card size='default'>
        <CardHeader>
          <CardTitle>Default Card</CardTitle>
          <CardDescription>Standard size for most use cases</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Default card content with more space</p>
        </CardContent>
      </Card>

      <Card size='lg'>
        <CardHeader>
          <CardTitle>Large Card</CardTitle>
          <CardDescription>Spacious design for detailed content</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Large card with generous padding and spacing</p>
        </CardContent>
      </Card>

      <Card size='xl'>
        <CardHeader>
          <CardTitle>Extra Large Card</CardTitle>
          <CardDescription>Maximum space for complex layouts</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>
            Extra large card with maximum padding for complex content layouts
          </p>
        </CardContent>
      </Card>
    </div>
  ),
};

export const Interactive: Story = {
  args: {
    variant: 'glass',
    interactive: true,
    children: (
      <>
        <CardHeader>
          <CardTitle>Interactive Card</CardTitle>
          <CardDescription>Click me to see the interaction</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>
            This card responds to hover and click interactions with smooth animations.
          </p>
        </CardContent>
      </>
    ),
  },
};
