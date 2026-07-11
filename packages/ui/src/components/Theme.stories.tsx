import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './Card';
import { Input } from './Input';
import { Badge } from './Badge';
import { StressTracker, ActionDots, ProgressRing } from './StressTracker';
import { Sun, Moon, Monitor, Star, Sword, Shield, Eye } from 'lucide-react';

const meta: Meta = {
  title: 'System/Theme System',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Comprehensive theme system for HeistMind UI with dark/light modes, game-specific colors, and consistent design tokens.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Theme demonstration component
const ThemeShowcase = () => {
  // For Storybook, we'll just show the current theme through CSS
  const currentTheme = document.documentElement.classList.contains('light') ? 'light' : 'dark';

  return (
    <div className='min-h-screen bg-background-primary p-8 transition-colors duration-300'>
      <div className='max-w-6xl mx-auto space-y-8'>
        {/* Header */}
        <div className='text-center space-y-4'>
          <h1 className='text-4xl font-bold text-foreground-primary'>HeistMind Theme System</h1>
          <p className='text-foreground-secondary text-lg'>
            Current theme:{' '}
            <code className='bg-background-secondary px-2 py-1 rounded'>{currentTheme}</code>
          </p>
          <p className='text-sm text-foreground-muted'>
            Use the theme toggle in the Storybook toolbar to switch between light and dark themes
          </p>
        </div>

        {/* Card titles render as h3 — bridge the outline so h1 → h3 doesn't skip a level. */}
        <h2 className='sr-only'>Theme reference</h2>

        {/* Color Palette */}
        <Card variant='elevated' className='p-6'>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Design system colors across all themes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
              {/* Background Colors */}
              <div className='space-y-3'>
                <h4 className='text-sm font-semibold text-foreground-primary'>Backgrounds</h4>
                <div className='space-y-2'>
                  <div className='flex items-center gap-3'>
                    <div className='w-6 h-6 rounded bg-background-primary border border-border-primary' />
                    <span className='text-sm'>Primary</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='w-6 h-6 rounded bg-background-secondary border border-border-primary' />
                    <span className='text-sm'>Secondary</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='w-6 h-6 rounded bg-background-elevated border border-border-primary' />
                    <span className='text-sm'>Elevated</span>
                  </div>
                </div>
              </div>

              {/* Game Colors */}
              <div className='space-y-3'>
                <h4 className='text-sm font-semibold text-foreground-primary'>Game Colors</h4>
                <div className='space-y-2'>
                  <div className='flex items-center gap-3'>
                    <div className='w-6 h-6 rounded bg-game-ember' />
                    <span className='text-sm'>Ember</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='w-6 h-6 rounded bg-game-steel' />
                    <span className='text-sm'>Steel</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='w-6 h-6 rounded bg-game-shadow' />
                    <span className='text-sm'>Shadow</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='w-6 h-6 rounded bg-game-crimson' />
                    <span className='text-sm'>Crimson</span>
                  </div>
                </div>
              </div>

              {/* Semantic Colors */}
              <div className='space-y-3'>
                <h4 className='text-sm font-semibold text-foreground-primary'>Semantic</h4>
                <div className='space-y-2'>
                  <div className='flex items-center gap-3'>
                    <div className='w-6 h-6 rounded bg-semantic-success' />
                    <span className='text-sm'>Success</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='w-6 h-6 rounded bg-semantic-warning' />
                    <span className='text-sm'>Warning</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='w-6 h-6 rounded bg-semantic-error' />
                    <span className='text-sm'>Error</span>
                  </div>
                  <div className='flex items-center gap-3'>
                    <div className='w-6 h-6 rounded bg-semantic-info' />
                    <span className='text-sm'>Info</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Component Showcase */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
          {/* Buttons */}
          <Card variant='glass' className='p-6'>
            <CardHeader>
              <CardTitle>Buttons in Current Theme</CardTitle>
              <CardDescription>All button variants adapt to the current theme</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='grid grid-cols-2 gap-3'>
                <Button variant='default'>Default</Button>
                <Button variant='secondary'>Secondary</Button>
                <Button variant='outline'>Outline</Button>
                <Button variant='ghost'>Ghost</Button>
                <Button variant='ember'>
                  <Sword className='w-4 h-4' />
                  Ember
                </Button>
                <Button variant='steel'>
                  <Shield className='w-4 h-4' />
                  Steel
                </Button>
                <Button variant='glass'>Glass</Button>
                <Button variant='neon'>Neon</Button>
              </div>
            </CardContent>
          </Card>

          {/* Inputs & Badges */}
          <Card variant='character' className='p-6'>
            <CardHeader>
              <CardTitle>Interactive Elements</CardTitle>
              <CardDescription>Form controls and status indicators</CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <Input
                label='Character Name'
                placeholder='Enter character name...'
                icon={<Eye className='w-4 h-4' />}
              />

              <div className='flex gap-2 flex-wrap'>
                <Badge variant='default'>Default</Badge>
                <Badge variant='ember' icon={<Star className='w-3 h-3' />}>
                  Ember
                </Badge>
                <Badge variant='steel'>Steel</Badge>
                <Badge variant='success'>Success</Badge>
                <Badge variant='warning'>Warning</Badge>
              </div>

              <div className='space-y-3'>
                <StressTracker current={6} max={9} />
                <ActionDots current={3} max={4} label='Prowess' variant='ember' />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Typography */}
        <Card variant='neumorphic' className='p-6'>
          <CardHeader>
            <CardTitle>Typography Scale</CardTitle>
            <CardDescription>Consistent text hierarchy across themes</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            {/* A visual type-scale SAMPLE, not document structure — real heading elements here
                would wreck the page outline (second h1, skipped levels). */}
            <div className='space-y-2'>
              <div className='text-4xl font-bold text-foreground-primary'>Heading 1</div>
              <div className='text-3xl font-semibold text-foreground-primary'>Heading 2</div>
              <div className='text-2xl font-medium text-foreground-primary'>Heading 3</div>
              <div className='text-xl font-medium text-foreground-secondary'>Heading 4</div>
              <p className='text-base text-foreground-primary'>
                Body text adapts to the current theme, maintaining readability and contrast.
              </p>
              <p className='text-sm text-foreground-secondary'>
                Secondary text is slightly muted but still accessible.
              </p>
              <p className='text-xs text-foreground-muted'>
                Muted text for less important information.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Theme Instructions */}
        <Card variant='gradient' className='p-6'>
          <CardHeader>
            <CardTitle>Theme Controls</CardTitle>
            <CardDescription>How to control theme switching in Storybook</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-4'>
              <div className='flex items-center gap-3 p-4 bg-background-secondary rounded-lg border border-border-secondary'>
                <div className='flex items-center justify-center w-8 h-8 bg-brand-primary rounded-full'>
                  <Monitor className='w-4 h-4 text-white' />
                </div>
                <div>
                  <h4 className='text-sm font-semibold text-foreground-primary'>
                    Storybook Toolbar
                  </h4>
                  <p className='text-xs text-foreground-muted'>
                    Use the paintbrush icon in the Storybook toolbar to switch between Light, Dark,
                    and System themes
                  </p>
                </div>
              </div>

              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 text-center'>
                <div className='p-3 bg-background-elevated rounded-lg border border-border-primary'>
                  <Sun className='w-6 h-6 mx-auto mb-2 text-game-gold' />
                  <div className='text-sm font-medium'>Light Theme</div>
                  <div className='text-xs text-foreground-muted'>Clean & bright</div>
                </div>

                <div className='p-3 bg-background-elevated rounded-lg border border-border-primary'>
                  <Moon className='w-6 h-6 mx-auto mb-2 text-brand-primary' />
                  <div className='text-sm font-medium'>Dark Theme</div>
                  <div className='text-xs text-foreground-muted'>Atmospheric & immersive</div>
                </div>

                <div className='p-3 bg-background-elevated rounded-lg border border-border-primary'>
                  <Monitor className='w-6 h-6 mx-auto mb-2 text-game-steel' />
                  <div className='text-sm font-medium'>System Theme</div>
                  <div className='text-xs text-foreground-muted'>Follows OS preference</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const ThemeSystemDemo: Story = {
  render: () => <ThemeShowcase />,
  parameters: {
    docs: {
      description: {
        story:
          'Complete demonstration of the HeistMind theme system. Use the theme toggle in the Storybook toolbar to see how all components adapt to different themes.',
      },
    },
  },
};

export const SimpleThemeDemo: Story = {
  render: () => (
    <div className='p-8 space-y-6'>
      <div className='space-y-4'>
        <h3 className='text-xl font-semibold text-foreground-primary'>Theme-Aware Components</h3>
        <p className='text-foreground-secondary'>
          Use the theme toggle in the Storybook toolbar to see how components adapt
        </p>

        <div className='flex gap-4 items-center'>
          <Button variant='default'>Default Button</Button>
          <Button variant='outline'>Outline Button</Button>
          <Button variant='ember'>Ember Theme</Button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <Card className='p-4'>
            <h4 className='text-foreground-primary font-semibold mb-2'>Theme-Aware Card</h4>
            <p className='text-foreground-secondary text-sm'>
              Background and text colors change automatically with the theme
            </p>
          </Card>

          <div className='space-y-2'>
            <Input placeholder='Theme-aware input' label='Input Field' />
            <div className='flex gap-2'>
              <Badge variant='default'>Default</Badge>
              <Badge variant='ember'>Ember</Badge>
              <Badge variant='success'>Success</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Simple demonstration of theme-aware components. Toggle the theme in the Storybook toolbar to see the changes.',
      },
    },
  },
};

export const ComponentShowcase: Story = {
  render: () => (
    <div className='p-8 space-y-8'>
      <div className='text-center space-y-2'>
        <h3 className='text-2xl font-bold text-foreground-primary'>Component Theme Adaptation</h3>
        <p className='text-foreground-secondary'>
          All components automatically adapt to the current theme. Use the toolbar to switch themes.
        </p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        <Card variant='default' className='p-4'>
          <CardHeader>
            <CardTitle>Default Card</CardTitle>
            <CardDescription>Standard card styling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <Button variant='default' className='w-full'>
                Primary Action
              </Button>
              <Input placeholder='Enter text...' />
              <Badge variant='default'>Status Badge</Badge>
            </div>
          </CardContent>
        </Card>

        <Card variant='glass' className='p-4'>
          <CardHeader>
            <CardTitle>Glass Card</CardTitle>
            <CardDescription>Glass morphism effect</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <Button variant='outline' className='w-full'>
                Secondary
              </Button>
              <div className='flex gap-2'>
                <Badge variant='ember'>Ember</Badge>
                <Badge variant='steel'>Steel</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card variant='character' className='p-4'>
          <CardHeader>
            <CardTitle>Character Card</CardTitle>
            <CardDescription>Game-themed styling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-3'>
              <Button variant='ember' className='w-full'>
                <Sword className='w-4 h-4' />
                Action
              </Button>
              <ProgressRing current={6} max={10} variant='ember' />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className='bg-background-secondary p-6 rounded-lg border border-border-primary'>
        <h4 className='text-lg font-semibold text-foreground-primary mb-4'>
          CSS Custom Properties
        </h4>
        <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
          <div>
            <div className='font-mono text-foreground-muted'>--color-background-primary</div>
            <div className='w-full h-6 bg-background-primary border border-border-primary rounded mt-1'></div>
          </div>
          <div>
            <div className='font-mono text-foreground-muted'>--color-foreground-primary</div>
            <div className='w-full h-6 bg-foreground-primary border border-border-primary rounded mt-1'></div>
          </div>
          <div>
            <div className='font-mono text-foreground-muted'>--color-brand-primary</div>
            <div className='w-full h-6 bg-brand-primary border border-border-primary rounded mt-1'></div>
          </div>
          <div>
            <div className='font-mono text-foreground-muted'>--color-game-ember</div>
            <div className='w-full h-6 bg-game-ember border border-border-primary rounded mt-1'></div>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Comprehensive showcase of how components adapt to theme changes. All colors and styling automatically update when switching themes.',
      },
    },
  },
};
