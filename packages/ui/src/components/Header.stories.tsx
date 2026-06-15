import type { Meta, StoryObj } from '@storybook/react';
import { Header, HeaderBrand, HeaderActions } from './Header';
import { Button } from './Button';
import { Badge } from './Badge';
import { ThemeToggle } from './ThemeToggle';
import { User, Crown, Settings, Bell } from 'lucide-react';

const meta: Meta<typeof Header> = {
  title: 'Navigation/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A flexible header component system for navigation bars. Includes HeaderBrand for logos/branding and HeaderActions for buttons and controls.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'glass', 'solid', 'floating'],
    },
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
    },
    sticky: {
      control: 'boolean',
    },
    shadow: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg'],
    },
    maxWidth: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl', 'full', 'none'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <>
        <HeaderBrand>
          <h1 className='text-xl font-bold text-foreground-primary'>
            <span className='text-brand-primary'>Heist</span>Mind
          </h1>
        </HeaderBrand>
        <HeaderActions>
          <Button variant='ghost' size='sm'>
            Sign In
          </Button>
          <Button variant='default' size='sm'>
            Sign Up
          </Button>
        </HeaderActions>
      </>
    ),
  },
};

export const WithLogo: Story = {
  args: {
    children: (
      <>
        <HeaderBrand
          logo={
            <div className='w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center'>
              <Crown className='w-5 h-5 text-white' />
            </div>
          }
        >
          <h1 className='text-xl font-bold text-foreground-primary'>
            <span className='text-brand-primary'>Heist</span>Mind
          </h1>
        </HeaderBrand>
        <HeaderActions>
          <ThemeToggle />
          <Button variant='outline' size='sm'>
            Sign In
          </Button>
          <Button variant='default' size='sm'>
            Get Started
          </Button>
        </HeaderActions>
      </>
    ),
  },
};

export const UserAuthenticated: Story = {
  args: {
    children: (
      <>
        <HeaderBrand
          logo={
            <div className='w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center'>
              <Crown className='w-5 h-5 text-white' />
            </div>
          }
        >
          <h1 className='text-xl font-bold text-foreground-primary'>
            <span className='text-brand-primary'>Heist</span>Mind
          </h1>
        </HeaderBrand>
        <HeaderActions>
          <div className='flex items-center gap-3'>
            <Button variant='ghost' size='sm'>
              <Bell className='w-4 h-4' />
            </Button>
            <Badge variant='ember' size='sm'>
              3 Active Games
            </Badge>
            <div className='flex items-center gap-2 text-sm text-foreground-secondary'>
              <div className='w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center'>
                <User className='w-4 h-4 text-white' />
              </div>
              <span>Shadow McKenzie</span>
            </div>
            <Button variant='ghost' size='sm'>
              <Settings className='w-4 h-4' />
            </Button>
          </div>
        </HeaderActions>
      </>
    ),
  },
};

export const VariantShowcase: Story = {
  render: () => (
    <div className='space-y-8 bg-background-primary min-h-screen'>
      <Header variant='default'>
        <HeaderBrand>
          <h2 className='text-lg font-semibold'>Default Header</h2>
        </HeaderBrand>
        <HeaderActions>
          <Button variant='ghost' size='sm'>
            Action
          </Button>
        </HeaderActions>
      </Header>

      <Header variant='glass'>
        <HeaderBrand>
          <h2 className='text-lg font-semibold'>Glass Header</h2>
        </HeaderBrand>
        <HeaderActions>
          <Button variant='ghost' size='sm'>
            Action
          </Button>
        </HeaderActions>
      </Header>

      <Header variant='solid'>
        <HeaderBrand>
          <h2 className='text-lg font-semibold'>Solid Header</h2>
        </HeaderBrand>
        <HeaderActions>
          <Button variant='ghost' size='sm'>
            Action
          </Button>
        </HeaderActions>
      </Header>

      <Header variant='floating'>
        <HeaderBrand>
          <h2 className='text-lg font-semibold'>Floating Header</h2>
        </HeaderBrand>
        <HeaderActions>
          <Button variant='ghost' size='sm'>
            Action
          </Button>
        </HeaderActions>
      </Header>

      <div className='p-8'>
        <h3 className='text-xl font-bold text-foreground-primary mb-4'>Header Variants</h3>
        <p className='text-foreground-secondary'>
          Different header styles for various design needs. The floating variant adds margin and
          rounded corners.
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Showcases all available header variants: default, glass, solid, and floating.',
      },
    },
  },
};

export const SizeVariants: Story = {
  render: () => (
    <div className='space-y-8 bg-background-primary min-h-screen'>
      <Header size='sm'>
        <HeaderBrand>
          <h2 className='text-lg font-semibold'>Small Header</h2>
        </HeaderBrand>
        <HeaderActions>
          <Button variant='ghost' size='sm'>
            Action
          </Button>
        </HeaderActions>
      </Header>

      <Header size='default'>
        <HeaderBrand>
          <h2 className='text-lg font-semibold'>Default Header</h2>
        </HeaderBrand>
        <HeaderActions>
          <Button variant='ghost' size='sm'>
            Action
          </Button>
        </HeaderActions>
      </Header>

      <Header size='lg'>
        <HeaderBrand>
          <h2 className='text-lg font-semibold'>Large Header</h2>
        </HeaderBrand>
        <HeaderActions>
          <Button variant='ghost' size='sm'>
            Action
          </Button>
        </HeaderActions>
      </Header>

      <div className='p-8'>
        <h3 className='text-xl font-bold text-foreground-primary mb-4'>Header Sizes</h3>
        <p className='text-foreground-secondary'>
          Different vertical padding options for headers: small, default, and large.
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates the three available header sizes with different vertical padding.',
      },
    },
  },
};

export const ClickableBrand: Story = {
  args: {
    children: (
      <>
        <HeaderBrand
          href='/'
          logo={
            <div className='w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center'>
              <Crown className='w-5 h-5 text-white' />
            </div>
          }
        >
          <h1 className='text-xl font-bold'>
            <span className='text-brand-primary'>Heist</span>Mind
          </h1>
        </HeaderBrand>
        <HeaderActions>
          <Button variant='outline' size='sm'>
            Documentation
          </Button>
          <Button variant='default' size='sm'>
            Get Started
          </Button>
        </HeaderActions>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows a clickable brand that can navigate to a home page or trigger an action.',
      },
    },
  },
};

export const ComplexNavigation: Story = {
  args: {
    children: (
      <>
        <HeaderBrand
          logo={
            <div className='w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center'>
              <Crown className='w-5 h-5 text-white' />
            </div>
          }
        >
          <div>
            <h1 className='text-lg font-bold text-foreground-primary'>
              <span className='text-brand-primary'>Heist</span>Mind
            </h1>
            <p className='text-xs text-foreground-muted'>Character Manager</p>
          </div>
        </HeaderBrand>
        <HeaderActions>
          <div className='hidden md:flex items-center gap-6 mr-6'>
            <a
              href='#'
              className='text-sm text-foreground-secondary hover:text-foreground-primary transition-colors'
            >
              Characters
            </a>
            <a
              href='#'
              className='text-sm text-foreground-secondary hover:text-foreground-primary transition-colors'
            >
              Games
            </a>
            <a
              href='#'
              className='text-sm text-foreground-secondary hover:text-foreground-primary transition-colors'
            >
              Community
            </a>
          </div>
          <div className='flex items-center gap-3'>
            <ThemeToggle />
            <Badge variant='glass' size='sm'>
              <Bell className='w-3 h-3 mr-1' />3
            </Badge>
            <div className='w-8 h-8 bg-game-ember rounded-full flex items-center justify-center'>
              <User className='w-4 h-4 text-white' />
            </div>
          </div>
        </HeaderActions>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'A complex navigation header with navigation links, notifications, and user avatar.',
      },
    },
  },
};

export const ResponsiveExample: Story = {
  args: {
    children: (
      <>
        <HeaderBrand
          logo={
            <div className='w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center'>
              <Crown className='w-5 h-5 text-white' />
            </div>
          }
        >
          <h1 className='text-lg md:text-xl font-bold text-foreground-primary'>
            <span className='text-brand-primary'>Heist</span>Mind
          </h1>
        </HeaderBrand>
        <HeaderActions>
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='sm' className='hidden sm:flex'>
              Sign In
            </Button>
            <Button variant='default' size='sm'>
              <span className='hidden sm:inline'>Get Started</span>
              <span className='sm:hidden'>Start</span>
            </Button>
          </div>
        </HeaderActions>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates responsive behavior with text and button changes at different screen sizes.',
      },
    },
  },
};

export const ThemeShowcase: Story = {
  render: () => (
    <div className='space-y-8 bg-background-primary min-h-screen'>
      <Header variant='default'>
        <HeaderBrand
          logo={
            <div className='w-8 h-8 bg-brand-primary rounded-lg flex items-center justify-center'>
              <Crown className='w-5 h-5 text-white' />
            </div>
          }
        >
          <h2 className='text-lg font-semibold'>Theme Showcase</h2>
        </HeaderBrand>
        <HeaderActions>
          <ThemeToggle showLabel />
          <Button variant='outline' size='sm'>
            Demo
          </Button>
        </HeaderActions>
      </Header>

      <div className='p-8'>
        <h3 className='text-xl font-bold text-foreground-primary mb-4'>Theme Adaptation</h3>
        <p className='text-foreground-secondary mb-6'>
          Headers automatically adapt to light and dark themes. Use the theme toggle above to see
          the transformation.
        </p>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 text-sm'>
          <div className='p-4 bg-background-secondary rounded border border-border-primary'>
            <strong className='text-foreground-primary'>Background:</strong>
            <br />
            <code className='text-foreground-muted'>bg-background-primary/95</code>
          </div>
          <div className='p-4 bg-background-secondary rounded border border-border-primary'>
            <strong className='text-foreground-primary'>Border:</strong>
            <br />
            <code className='text-foreground-muted'>border-border-primary</code>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows how Header components adapt their styling across light and dark themes.',
      },
    },
  },
};
