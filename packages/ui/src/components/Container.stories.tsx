import type { Meta, StoryObj } from '@storybook/react';
import { Container } from './Container';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';

const meta: Meta<typeof Container> = {
  title: 'Layout/Container',
  component: Container,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'A responsive container component that centers content with consistent horizontal padding. Supports various max-width constraints and semantic HTML elements.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    maxWidth: {
      control: 'select',
      options: [
        'xs',
        'sm',
        'md',
        'lg',
        'xl',
        '2xl',
        '3xl',
        '4xl',
        '5xl',
        '6xl',
        '7xl',
        'full',
        'none',
      ],
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
    },
    center: {
      control: 'boolean',
    },
    asSection: {
      control: 'boolean',
    },
    asMain: {
      control: 'boolean',
    },
    asArticle: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div className='py-8'>
        <h2 className='text-2xl font-bold text-foreground-primary mb-4'>Default Container</h2>
        <p className='text-foreground-secondary'>
          This container uses the default max-width (7xl) and medium padding. Content is centered
          with responsive horizontal padding that adapts to screen size.
        </p>
      </div>
    ),
  },
};

export const MaxWidthVariants: Story = {
  render: () => (
    <div className='space-y-8 py-8'>
      {(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl', '7xl'] as const).map(
        width => (
          <Container
            key={width}
            maxWidth={width}
            className='bg-background-secondary/50 border border-border-primary rounded-lg'
          >
            <div className='py-4'>
              <h3 className='text-lg font-semibold text-foreground-primary'>Max Width: {width}</h3>
              <p className='text-foreground-secondary text-sm'>
                This container demonstrates the {width} max-width constraint with visual boundaries.
              </p>
            </div>
          </Container>
        )
      )}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates all available max-width variants from xs (320px) to 7xl (1280px).',
      },
    },
  },
};

export const PaddingVariants: Story = {
  render: () => (
    <div className='space-y-8 py-8'>
      {(['none', 'sm', 'md', 'lg', 'xl'] as const).map(padding => (
        <Container
          key={padding}
          padding={padding}
          className='bg-background-secondary/50 border border-border-primary rounded-lg'
        >
          <div className='py-4'>
            <h3 className='text-lg font-semibold text-foreground-primary'>Padding: {padding}</h3>
            <p className='text-foreground-secondary text-sm'>
              This container demonstrates the {padding} padding variant.
            </p>
          </div>
        </Container>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows different horizontal padding options from none to xl.',
      },
    },
  },
};

export const SemanticElements: Story = {
  render: () => (
    <div className='space-y-8 py-8'>
      <Container
        asSection
        className='bg-background-secondary/50 border border-border-primary rounded-lg'
      >
        <div className='py-4'>
          <h3 className='text-lg font-semibold text-foreground-primary'>As Section Element</h3>
          <p className='text-foreground-secondary text-sm'>
            Renders as a semantic &lt;section&gt; element for proper document structure.
          </p>
        </div>
      </Container>

      <Container
        asMain
        className='bg-background-secondary/50 border border-border-primary rounded-lg'
      >
        <div className='py-4'>
          <h3 className='text-lg font-semibold text-foreground-primary'>As Main Element</h3>
          <p className='text-foreground-secondary text-sm'>
            Renders as a semantic &lt;main&gt; element for the primary content area.
          </p>
        </div>
      </Container>

      <Container
        asArticle
        className='bg-background-secondary/50 border border-border-primary rounded-lg'
      >
        <div className='py-4'>
          <h3 className='text-lg font-semibold text-foreground-primary'>As Article Element</h3>
          <p className='text-foreground-secondary text-sm'>
            Renders as a semantic &lt;article&gt; element for standalone content.
          </p>
        </div>
      </Container>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates semantic HTML element variants for improved accessibility and SEO.',
      },
    },
  },
};

export const RealWorldExample: Story = {
  render: () => (
    <div className='min-h-screen bg-background-primary'>
      <Container asMain className='py-12'>
        <div className='text-center space-y-8'>
          <div className='space-y-4'>
            <h1 className='text-4xl md:text-6xl font-bold text-foreground-primary'>
              Welcome to <span className='text-brand-fg'>HeistMind</span>
            </h1>
            <p className='text-xl text-foreground-secondary max-w-2xl mx-auto'>
              A complete character management platform for Forged in the Dark tabletop RPGs.
            </p>
          </div>

          {/* Card titles render as h3 — bridge the outline so h1 → h3 doesn't skip a level. */}
          <h2 className='sr-only'>What HeistMind does</h2>
          <div className='grid md:grid-cols-3 gap-6 mt-12'>
            <Card>
              <CardHeader>
                <CardTitle>Character Creation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-foreground-secondary'>
                  Build characters using any Forged in the Dark ruleset with our dynamic creation
                  system.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-foreground-secondary'>
                  Organize characters across multiple games and track advancement, stress, and
                  relationships.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Collaboration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-foreground-secondary'>
                  Share characters with GMs and collaborate on crew sheets and faction
                  relationships.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className='mt-16 space-y-4'>
            <Button variant='default' size='lg'>
              Get Started
            </Button>
            <p className='text-foreground-muted text-sm'>
              Join thousands of players managing their scoundrels
            </p>
          </div>
        </div>
      </Container>
    </div>
  ),
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'A real-world example showing how Container is used in a landing page layout with cards and content.',
      },
    },
  },
};

export const ResponsiveDemo: Story = {
  render: () => (
    <div className='space-y-8 py-8'>
      <Container
        maxWidth='sm'
        className='bg-semantic-info/10 border border-semantic-info rounded-lg'
      >
        <div className='py-4'>
          <h3 className='text-lg font-semibold text-semantic-info-fg'>Mobile First (sm)</h3>
          <p className='text-foreground-secondary text-sm'>
            Perfect for mobile-first content and narrow forms.
          </p>
        </div>
      </Container>

      <Container
        maxWidth='2xl'
        className='bg-semantic-warning/10 border border-semantic-warning rounded-lg'
      >
        <div className='py-4'>
          <h3 className='text-lg font-semibold text-semantic-warning-fg'>Content Width (2xl)</h3>
          <p className='text-foreground-secondary text-sm'>
            Ideal for article content and reading experiences.
          </p>
        </div>
      </Container>

      <Container
        maxWidth='7xl'
        className='bg-semantic-success/10 border border-semantic-success rounded-lg'
      >
        <div className='py-4'>
          <h3 className='text-lg font-semibold text-semantic-success-fg'>
            Application Width (7xl)
          </h3>
          <p className='text-foreground-secondary text-sm'>
            Perfect for full-featured application layouts and dashboards.
          </p>
        </div>
      </Container>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Shows common responsive patterns and use cases for different container widths.',
      },
    },
  },
};

export const CustomMaxWidth: Story = {
  args: {
    customMaxWidth: '600px',
    children: (
      <div className='py-8 bg-background-secondary/50 border border-border-primary rounded-lg'>
        <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Custom Max Width</h3>
        <p className='text-foreground-secondary text-sm'>
          This container uses a custom max-width of 600px, demonstrating the flexibility of the
          customMaxWidth prop for specific design requirements.
        </p>
      </div>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Demonstrates using the customMaxWidth prop for specific design requirements.',
      },
    },
  },
};

export const ThemeShowcase: Story = {
  render: () => (
    <div className='space-y-8 py-8'>
      <Container className='bg-background-secondary border border-border-primary rounded-lg'>
        <div className='py-6 text-center'>
          <h3 className='text-2xl font-bold text-foreground-primary mb-4'>Theme Adaptation</h3>
          <p className='text-foreground-secondary mb-6'>
            Containers automatically adapt their styling to the current theme. Use the theme toggle
            in the Storybook toolbar to see the transformation.
          </p>
          <div className='grid grid-cols-2 gap-4 text-sm'>
            <div className='p-3 bg-background-tertiary rounded border border-border-secondary'>
              <strong className='text-foreground-primary'>Background:</strong>
              <br />
              <code className='text-foreground-muted'>bg-background-primary</code>
            </div>
            <div className='p-3 bg-background-tertiary rounded border border-border-secondary'>
              <strong className='text-foreground-primary'>Text:</strong>
              <br />
              <code className='text-foreground-muted'>text-foreground-primary</code>
            </div>
          </div>
        </div>
      </Container>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Shows how Container components adapt their appearance across light and dark themes.',
      },
    },
  },
};
