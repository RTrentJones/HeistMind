import type { Meta, StoryObj } from '@storybook/react';
import { Section } from './Section';

const meta: Meta<typeof Section> = {
  title: 'Layout/Section',
  component: Section,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Semantic section component for page layout with background variants, spacing, and width constraints.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'secondary', 'tertiary', 'elevated', 'glass', 'hero', 'feature'],
      description: 'Background style variant',
    },
    padding: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg', 'xl', '2xl'],
      description: 'Vertical padding',
    },
    spacing: {
      control: { type: 'select' },
      options: ['none', 'sm', 'md', 'lg', 'xl'],
      description: 'Space between child elements',
    },
    width: {
      control: { type: 'select' },
      options: ['full', 'container', 'narrow', 'wide'],
      description: 'Content width constraint',
    },
    position: {
      control: { type: 'select' },
      options: ['relative', 'sticky', 'fixed'],
      description: 'CSS positioning',
    },
    as: {
      control: { type: 'select' },
      options: ['section', 'article', 'aside', 'header', 'footer', 'main', 'nav', 'div'],
      description: 'HTML element to render',
    },
    heading: {
      control: { type: 'text' },
      description: 'Section heading text',
    },
    subheading: {
      control: { type: 'text' },
      description: 'Section subheading text',
    },
    animate: {
      control: { type: 'boolean' },
      description: 'Enable mount animation',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Sample content for demonstrations
const SampleContent = () => (
  <div className='grid md:grid-cols-3 gap-6'>
    <div className='p-4 bg-background-secondary border border-border-primary rounded-lg'>
      <h3 className='font-semibold text-foreground-primary mb-2'>Feature One</h3>
      <p className='text-foreground-secondary text-sm'>
        Description of the first key feature and its benefits.
      </p>
    </div>
    <div className='p-4 bg-background-secondary border border-border-primary rounded-lg'>
      <h3 className='font-semibold text-foreground-primary mb-2'>Feature Two</h3>
      <p className='text-foreground-secondary text-sm'>
        Description of the second key feature and its benefits.
      </p>
    </div>
    <div className='p-4 bg-background-secondary border border-border-primary rounded-lg'>
      <h3 className='font-semibold text-foreground-primary mb-2'>Feature Three</h3>
      <p className='text-foreground-secondary text-sm'>
        Description of the third key feature and its benefits.
      </p>
    </div>
  </div>
);

export const Default: Story = {
  args: {
    children: <SampleContent />,
  },
};

export const Variants: Story = {
  render: () => (
    <div>
      <Section variant='default' padding='md'>
        <div className='text-center'>
          <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Default Section</h3>
          <p className='text-foreground-secondary'>Primary background with standard styling.</p>
        </div>
      </Section>

      <Section variant='secondary' padding='md'>
        <div className='text-center'>
          <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Secondary Section</h3>
          <p className='text-foreground-secondary'>
            Subtle background variation for content separation.
          </p>
        </div>
      </Section>

      <Section variant='tertiary' padding='md'>
        <div className='text-center'>
          <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Tertiary Section</h3>
          <p className='text-foreground-secondary'>Alternative background for diverse layouts.</p>
        </div>
      </Section>

      <Section variant='elevated' padding='md'>
        <div className='text-center'>
          <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Elevated Section</h3>
          <p className='text-foreground-secondary'>Elevated appearance for important content.</p>
        </div>
      </Section>

      <Section variant='hero' padding='xl'>
        <div className='text-center'>
          <h3 className='text-2xl font-bold text-foreground-primary mb-4'>Hero Section</h3>
          <p className='text-foreground-secondary text-lg'>
            Gradient background for hero sections and landing pages.
          </p>
        </div>
      </Section>

      <Section variant='feature' padding='lg'>
        <div className='text-center'>
          <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Feature Section</h3>
          <p className='text-foreground-secondary'>Bordered section for highlighting features.</p>
        </div>
      </Section>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available background variants for different section purposes.',
      },
    },
  },
};

export const Padding: Story = {
  render: () => (
    <div>
      <Section variant='secondary' padding='none'>
        <div className='text-center bg-background-tertiary py-4 rounded'>
          <p className='text-foreground-primary'>No Padding</p>
        </div>
      </Section>

      <Section variant='secondary' padding='sm'>
        <div className='text-center bg-background-tertiary py-4 rounded'>
          <p className='text-foreground-primary'>Small Padding</p>
        </div>
      </Section>

      <Section variant='secondary' padding='md'>
        <div className='text-center bg-background-tertiary py-4 rounded'>
          <p className='text-foreground-primary'>Medium Padding</p>
        </div>
      </Section>

      <Section variant='secondary' padding='lg'>
        <div className='text-center bg-background-tertiary py-4 rounded'>
          <p className='text-foreground-primary'>Large Padding</p>
        </div>
      </Section>

      <Section variant='secondary' padding='xl'>
        <div className='text-center bg-background-tertiary py-4 rounded'>
          <p className='text-foreground-primary'>Extra Large Padding</p>
        </div>
      </Section>

      <Section variant='secondary' padding='2xl'>
        <div className='text-center bg-background-tertiary py-4 rounded'>
          <p className='text-foreground-primary'>2X Large Padding</p>
        </div>
      </Section>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Different vertical padding options for sections.',
      },
    },
  },
};

export const WidthConstraints: Story = {
  render: () => (
    <div>
      <Section variant='secondary' width='narrow' padding='md'>
        <div className='text-center bg-background-tertiary py-4 rounded'>
          <h3 className='font-semibold text-foreground-primary mb-2'>Narrow Width</h3>
          <p className='text-foreground-secondary'>
            Content constrained to max-w-4xl for focused reading.
          </p>
        </div>
      </Section>

      <Section variant='tertiary' width='container' padding='md'>
        <div className='text-center bg-background-tertiary py-4 rounded'>
          <h3 className='font-semibold text-foreground-primary mb-2'>Container Width</h3>
          <p className='text-foreground-secondary'>
            Standard container width (max-w-7xl) for most content.
          </p>
        </div>
      </Section>

      <Section variant='secondary' width='wide' padding='md'>
        <div className='text-center bg-background-tertiary py-4 rounded'>
          <h3 className='font-semibold text-foreground-primary mb-2'>Wide Width</h3>
          <p className='text-foreground-secondary'>
            Extended width (max-w-screen-2xl) for expansive layouts.
          </p>
        </div>
      </Section>

      <Section variant='tertiary' width='full' padding='md'>
        <div className='text-center bg-background-tertiary py-4 rounded'>
          <h3 className='font-semibold text-foreground-primary mb-2'>Full Width</h3>
          <p className='text-foreground-secondary'>
            No width constraints, spans the entire viewport.
          </p>
        </div>
      </Section>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Width constraint options for different content layouts.',
      },
    },
  },
};

export const WithHeadings: Story = {
  render: () => (
    <div>
      <Section
        variant='hero'
        padding='xl'
        heading='Welcome to HeistMind'
        subheading='The ultimate platform for managing your Forged in the Dark campaigns and characters.'
      >
        <SampleContent />
      </Section>

      <Section
        variant='secondary'
        padding='lg'
        heading='Key Features'
        subheading='Everything you need to run memorable tabletop RPG sessions.'
      >
        <SampleContent />
      </Section>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Sections with built-in heading and subheading support.',
      },
    },
  },
};

export const WithBackground: Story = {
  render: () => (
    <Section
      variant='hero'
      padding='xl'
      heading='Decorative Background'
      subheading='Section with custom background decoration element.'
      background={
        <div className='absolute inset-0 opacity-10'>
          <div className='absolute top-10 left-10 w-32 h-32 bg-brand-primary rounded-full blur-3xl' />
          <div className='absolute bottom-10 right-10 w-48 h-48 bg-brand-accent rounded-full blur-3xl' />
          <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-secondary rounded-full blur-3xl' />
        </div>
      }
    >
      <SampleContent />
    </Section>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Section with custom background decoration elements.',
      },
    },
  },
};

export const StickyHeader: Story = {
  render: () => (
    <div className='h-96 overflow-y-auto border border-border-primary rounded-lg'>
      <Section variant='elevated' position='sticky' padding='sm' width='full' as='header'>
        <div className='text-center'>
          <h3 className='font-semibold text-foreground-primary'>Sticky Header</h3>
          <p className='text-sm text-foreground-secondary'>
            This header stays at the top while scrolling
          </p>
        </div>
      </Section>

      <Section variant='default' padding='md'>
        <div className='space-y-4'>
          {Array.from({ length: 10 }, (_, i) => (
            <div
              key={i}
              className='p-4 bg-background-secondary rounded border border-border-primary'
            >
              <h4 className='font-medium text-foreground-primary'>Content Block {i + 1}</h4>
              <p className='text-foreground-secondary text-sm mt-1'>
                This is some sample content to demonstrate scrolling behavior with a sticky header.
              </p>
            </div>
          ))}
        </div>
      </Section>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Sticky positioned section that remains at the top during scroll.',
      },
    },
  },
};

export const WithAnimation: Story = {
  args: {
    children: <SampleContent />,
    animate: true,
    variant: 'hero',
    padding: 'lg',
  },
  parameters: {
    docs: {
      description: {
        story: 'Section with mount animation enabled.',
      },
    },
  },
};

export const LandingPage: Story = {
  render: () => (
    <div>
      {/* Hero Section */}
      <Section variant='hero' padding='2xl' as='main' animate>
        <div className='text-center'>
          <h1 className='text-4xl md:text-6xl font-bold text-foreground-primary mb-6'>
            Welcome to <span className='text-brand-accent'>Heist</span>Mind
          </h1>
          <p className='text-xl text-foreground-secondary max-w-2xl mx-auto mb-8'>
            The ultimate character management platform for Forged in the Dark tabletop RPGs. Create,
            manage, and advance your scoundrels across multiple campaigns.
          </p>
          <div className='flex gap-4 justify-center'>
            <button className='px-6 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors'>
              Get Started
            </button>
            <button className='px-6 py-3 border border-border-primary text-foreground-primary rounded-lg hover:bg-background-secondary transition-colors'>
              Learn More
            </button>
          </div>
        </div>
      </Section>

      {/* Features Section */}
      <Section
        variant='secondary'
        padding='xl'
        heading='Powerful Features'
        subheading='Everything you need to manage your dark and gritty campaigns.'
        as='section'
      >
        <div className='grid md:grid-cols-3 gap-8'>
          <div className='text-center p-6'>
            <div className='w-16 h-16 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4'>
              <span className='text-2xl'>⚔️</span>
            </div>
            <h3 className='text-lg font-semibold text-foreground-primary mb-2'>
              Character Creation
            </h3>
            <p className='text-foreground-secondary'>
              Build complex characters with detailed backgrounds, skills, and equipment tracking.
            </p>
          </div>

          <div className='text-center p-6'>
            <div className='w-16 h-16 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4'>
              <span className='text-2xl'>🎲</span>
            </div>
            <h3 className='text-lg font-semibold text-foreground-primary mb-2'>Dice Rolling</h3>
            <p className='text-foreground-secondary'>
              Integrated dice mechanics with modifiers, stress tracking, and consequence management.
            </p>
          </div>

          <div className='text-center p-6'>
            <div className='w-16 h-16 bg-brand-primary/20 rounded-lg flex items-center justify-center mx-auto mb-4'>
              <span className='text-2xl'>👥</span>
            </div>
            <h3 className='text-lg font-semibold text-foreground-primary mb-2'>
              Campaign Management
            </h3>
            <p className='text-foreground-secondary'>
              Organize multiple campaigns, track crew relationships, and manage faction standings.
            </p>
          </div>
        </div>
      </Section>

      {/* CTA Section */}
      <Section variant='feature' padding='xl' as='section'>
        <div className='text-center'>
          <h2 className='text-3xl font-bold text-foreground-primary mb-4'>
            Ready to Start Your Next Heist?
          </h2>
          <p className='text-foreground-secondary mb-8 max-w-xl mx-auto'>
            Join thousands of players already using HeistMind to manage their Forged in the Dark
            campaigns.
          </p>
          <button className='px-8 py-3 bg-brand-primary text-white rounded-lg hover:bg-brand-secondary transition-colors'>
            Sign Up with Discord
          </button>
        </div>
      </Section>

      {/* Footer */}
      <Section variant='tertiary' padding='lg' as='footer' width='full'>
        <div className='text-center'>
          <p className='text-foreground-muted text-sm'>
            © 2024 HeistMind. Built for the Forged in the Dark community.
          </p>
        </div>
      </Section>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Complete landing page layout using multiple section variants.',
      },
    },
  },
};
