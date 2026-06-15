import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { Input } from './Input';
import { Badge } from './Badge';
import { Tooltip, TooltipProvider } from './Tooltip';
import { StressTracker, ActionDots, ProgressRing } from './StressTracker';
import { useState } from 'react';
import { User, Mail, Eye, Star, Sword, Shield } from 'lucide-react';

const meta: Meta = {
  title: 'System/Component Integration Test',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Comprehensive test of all UI components working together with consistent theming and interactions.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <TooltipProvider>
        <div className='min-h-screen bg-background-primary p-8 transition-colors'>
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const FullSystemTest: Story = {
  render: () => {
    const [inputValue, setInputValue] = useState('');
    const [stress, setStress] = useState(4);
    const [prowess, setProwess] = useState(2);
    const [isLoading, setIsLoading] = useState(false);

    const handleLoadingDemo = () => {
      setIsLoading(true);
      setTimeout(() => setIsLoading(false), 2000);
    };

    return (
      <div className='max-w-6xl mx-auto space-y-8'>
        <div className='text-center space-y-4'>
          <h1 className='text-4xl font-bold text-foreground-primary font-display'>
            HeistMind UI System
          </h1>
          <p className='text-foreground-secondary text-lg'>
            Component Integration & Consistency Test
          </p>
        </div>

        {/* Interactive Components Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Interactive Card Test */}
          <Card variant='character' interactive className='p-6'>
            <CardHeader>
              <CardTitle variant='gradient'>Interactive Character Card</CardTitle>
              <CardDescription>Hover and click to test interactions</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex gap-2 flex-wrap'>
                <Badge variant='master' icon={<Star className='w-3 h-3' />}>
                  Master Level
                </Badge>
                <Badge variant='ember'>Combat Ready</Badge>
                <Badge variant='steel'>Tactical</Badge>
              </div>

              <StressTracker current={stress} max={9} onChange={setStress} interactive />

              <ActionDots
                current={prowess}
                max={4}
                onChange={setProwess}
                interactive
                label='Prowess'
                variant='ember'
              />
            </CardContent>
          </Card>

          {/* Input Variants Test */}
          <Card variant='elevated' className='p-6'>
            <CardHeader>
              <CardTitle>Input Component Test</CardTitle>
              <CardDescription>All input variants with real interactions</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Input
                variant='default'
                placeholder='Default input'
                label='Character Name'
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                icon={<User className='w-4 h-4' />}
              />

              <Input
                variant='neon'
                placeholder='Neon variant with focus effects'
                label='Special Input'
                icon={<Mail className='w-4 h-4' />}
                iconPosition='right'
              />

              <Input
                type='password'
                placeholder='Password with toggle'
                label='Secret Code'
                showPasswordToggle
                variant='ember'
                icon={<Shield className='w-4 h-4' />}
              />

              <Input
                variant='steel'
                placeholder='Input with validation'
                label='Validated Input'
                success={inputValue.length > 3 ? 'Valid character name' : undefined}
                error={
                  inputValue.length > 0 && inputValue.length <= 3 ? 'Name too short' : undefined
                }
              />
            </CardContent>
          </Card>
        </div>

        {/* Button Variants Test */}
        <Card variant='glass' className='p-6'>
          <CardHeader>
            <CardTitle>Button Interaction Test</CardTitle>
            <CardDescription>
              All button variants with hover, focus, and loading states
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4'>
              <Button variant='default' onClick={handleLoadingDemo}>
                Default
              </Button>

              <Button variant='ember'>
                <Sword className='w-4 h-4' />
                Ember
              </Button>

              <Button variant='steel'>
                <Shield className='w-4 h-4' />
                Steel
              </Button>

              <Button variant='neon'>Neon</Button>

              <Button variant='outline'>Outline</Button>

              <Button variant='ghost'>Ghost</Button>

              <Button variant='destructive'>Danger</Button>

              <Button variant='secondary'>Secondary</Button>

              <Button variant='default' loading={isLoading} loadingText='Processing...'>
                Loading Test
              </Button>

              <Button variant='ember' disabled>
                Disabled
              </Button>

              <Button size='sm' variant='crimson'>
                Small
              </Button>

              <Button size='lg' variant='glass'>
                Large
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tooltip & Badge Test */}
        <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
          <Card variant='gradient' className='p-6'>
            <CardHeader>
              <CardTitle>Tooltip Integration</CardTitle>
              <CardDescription>Hover over elements for contextual information</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='flex gap-2 flex-wrap'>
                <Tooltip content='This badge shows character level' variant='glass'>
                  <Badge variant='master' interactive icon={<Star className='w-3 h-3' />}>
                    Level 10
                  </Badge>
                </Tooltip>

                <Tooltip content='Current stress level - watch out!' variant='crimson'>
                  <Badge variant='stress-high'>High Stress</Badge>
                </Tooltip>

                <Tooltip content='Combat readiness indicator' variant='ember'>
                  <Badge variant='ember' icon={<Sword className='w-3 h-3' />}>
                    Ready
                  </Badge>
                </Tooltip>
              </div>

              <div className='flex gap-4'>
                <Tooltip content='Click to see details' variant='steel'>
                  <Button variant='outline'>
                    <Eye className='w-4 h-4' />
                    Inspect
                  </Button>
                </Tooltip>

                <Tooltip content='Advanced action' variant='dark'>
                  <Button variant='neon'>Special</Button>
                </Tooltip>
              </div>
            </CardContent>
          </Card>

          <Card variant='neumorphic' className='p-6'>
            <CardHeader>
              <CardTitle>Progress Indicators</CardTitle>
              <CardDescription>Game-specific progress tracking</CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              <div className='grid grid-cols-2 gap-6'>
                <div className='text-center space-y-2'>
                  <ProgressRing current={stress} max={9} variant='stress' />
                  <div className='text-sm text-foreground-muted'>Stress</div>
                </div>

                <div className='text-center space-y-2'>
                  <ProgressRing current={6} max={8} variant='ember' />
                  <div className='text-sm text-foreground-muted'>Heat</div>
                </div>
              </div>

              <div className='space-y-3'>
                <ActionDots current={3} max={4} label='Insight' variant='steel' interactive />

                <ActionDots current={2} max={4} label='Resolve' variant='crimson' interactive />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Summary */}
        <Card variant='success' className='p-6'>
          <CardContent>
            <div className='text-center space-y-2'>
              <h3 className='text-xl font-semibold text-semantic-success'>
                ✅ All Components Functional
              </h3>
              <p className='text-semantic-success/80'>
                All interactive elements are working correctly with consistent theming and smooth
                animations.
              </p>
              <div className='flex justify-center gap-2 mt-4'>
                <Badge variant='success'>Buttons</Badge>
                <Badge variant='success'>Cards</Badge>
                <Badge variant='success'>Inputs</Badge>
                <Badge variant='success'>Badges</Badge>
                <Badge variant='success'>Tooltips</Badge>
                <Badge variant='success'>Game Components</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
};
