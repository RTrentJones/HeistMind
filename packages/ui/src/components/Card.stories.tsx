import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { User, Shield, Sword, Crown, Target, Star } from 'lucide-react';

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
          <p className='text-sm text-foreground-muted'>
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
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 bg-background-primary min-h-screen'>
      <Card variant='default'>
        <CardHeader>
          <CardTitle>Default</CardTitle>
          <CardDescription>Standard card styling</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Basic card with standard styling and hover effects.</p>
        </CardContent>
      </Card>

      <Card variant='glass' interactive>
        <CardHeader>
          <CardTitle>Glass</CardTitle>
          <CardDescription>Glass morphism effect</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Translucent card with backdrop blur for modern aesthetics.</p>
        </CardContent>
      </Card>

      <Card variant='elevated' interactive>
        <CardHeader>
          <CardTitle>Elevated</CardTitle>
          <CardDescription>Enhanced shadow depth</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Elevated card with pronounced shadows and lift effect.</p>
        </CardContent>
      </Card>

      <Card variant='outline' interactive>
        <CardHeader>
          <CardTitle>Outline</CardTitle>
          <CardDescription>Outlined with glow effect</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Transparent card with colored borders and glow on hover.</p>
        </CardContent>
      </Card>

      <Card variant='gradient' interactive>
        <CardHeader>
          <CardTitle>Gradient</CardTitle>
          <CardDescription>Gradient background</CardDescription>
        </CardHeader>
        <CardContent>
          <p className='text-sm'>Card with subtle gradient background for visual depth.</p>
        </CardContent>
      </Card>

      <Card variant='neumorphic' interactive>
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
    <div className='max-w-md bg-background-primary p-6'>
      <Card variant='character' interactive>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center'>
              <User className='w-6 h-6 text-brand-accent' />
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
              <div className='text-2xl font-bold text-brand-accent'>3</div>
              <div className='text-xs text-foreground-muted'>Prowl</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-game-steel'>2</div>
              <div className='text-xs text-foreground-muted'>Survey</div>
            </div>
            <div className='text-center'>
              <div className='text-2xl font-bold text-semantic-success'>4</div>
              <div className='text-xs text-foreground-muted'>Finesse</div>
            </div>
          </div>
          <div className='flex items-center gap-2 text-sm'>
            <Shield className='w-4 h-4 text-game-steel' />
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
    <div className='grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-background-primary'>
      <Card variant='character'>
        <CardHeader>
          <CardTitle variant='gradient'>Heist Planning</CardTitle>
          <CardDescription>Plan your next score</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-3'>
            <div className='flex items-center gap-2'>
              <Crown className='w-4 h-4 text-semantic-warning' />
              <span className='text-sm'>Target: The Doskvol Bank</span>
            </div>
            <div className='flex items-center gap-2'>
              <Target className='w-4 h-4 text-semantic-error' />
              <span className='text-sm'>Security Level: High</span>
            </div>
            <div className='flex items-center gap-2'>
              <Shield className='w-4 h-4 text-game-steel' />
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
          <p className='text-sm text-semantic-error'>
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
          <p className='text-sm text-semantic-success'>
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
    <div className='space-y-6 p-6 bg-background-primary'>
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

export const ThemeShowcase: Story = {
  render: () => (
    <div className='space-y-8 p-6'>
      <div className='space-y-3'>
        <h3 className='text-lg font-semibold text-foreground-primary'>Cards in Current Theme</h3>
        <p className='text-sm text-foreground-secondary'>
          Use the theme toggle in the Storybook toolbar to see theme adaptation
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        <Card variant='default'>
          <CardHeader>
            <CardTitle>Default Card</CardTitle>
            <CardDescription>Adapts to current theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex gap-2 mb-3'>
              <Badge variant='default'>Status</Badge>
              <Badge variant='ember' icon={<Star className='w-3 h-3' />}>
                Featured
              </Badge>
            </div>
            <p className='text-sm text-foreground-secondary'>
              Background and text colors automatically adjust.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant='default' size='sm'>
              Action
            </Button>
          </CardFooter>
        </Card>

        <Card variant='elevated'>
          <CardHeader>
            <CardTitle>Elevated Card</CardTitle>
            <CardDescription>Enhanced depth and shadow</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-2'>
              <div className='text-xs text-foreground-muted'>Theme-aware properties:</div>
              <div className='text-xs font-mono bg-background-secondary p-2 rounded'>
                bg-background-primary
                <br />
                text-foreground-primary
                <br />
                border-border-primary
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant='glass'>
          <CardHeader>
            <CardTitle>Glass Card</CardTitle>
            <CardDescription>Translucent glass effect</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm'>Glass morphism design maintains its effect across themes.</p>
          </CardContent>
        </Card>

        <Card variant='character' interactive>
          <CardHeader>
            <CardTitle variant='gradient'>Character Card</CardTitle>
            <CardDescription>Game-themed with interactions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-2'>
              <Sword className='w-4 h-4 text-game-ember' />
              <span className='text-sm'>Combat Ready</span>
            </div>
          </CardContent>
        </Card>

        <Card variant='neumorphic'>
          <CardHeader>
            <CardTitle>Neumorphic</CardTitle>
            <CardDescription>Soft, embossed appearance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm'>Subtle depth with theme-aware shadows.</p>
          </CardContent>
        </Card>

        <Card variant='outline'>
          <CardHeader>
            <CardTitle>Outline Card</CardTitle>
            <CardDescription>Border-focused design</CardDescription>
          </CardHeader>
          <CardContent>
            <p className='text-sm'>Clean outline style that adapts to theme colors.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'Comprehensive showcase of how different card variants adapt to theme changes. Notice how background colors, text contrast, and borders all update automatically.',
      },
    },
  },
};
