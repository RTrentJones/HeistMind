import type { Meta, StoryObj } from '@storybook/react';
import { Paragraph } from './Paragraph';

const meta: Meta<typeof Paragraph> = {
  title: 'Typography/Paragraph',
  component: Paragraph,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Semantic paragraph component with consistent spacing, styling, and layout options.',
      },
    },
  },
  argTypes: {
    variant: {
      control: { type: 'select' },
      options: ['default', 'secondary', 'muted', 'accent', 'lead', 'caption', 'description'],
      description: 'Visual style variant',
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'base', 'lg', 'xl'],
      description: 'Text size',
    },
    spacing: {
      control: { type: 'select' },
      options: ['none', 'tight', 'normal', 'relaxed', 'loose'],
      description: 'Bottom margin spacing',
    },
    maxWidth: {
      control: { type: 'select' },
      options: ['none', 'xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl', 'prose'],
      description: 'Maximum width constraint',
    },
    align: {
      control: { type: 'select' },
      options: ['left', 'center', 'right', 'justify'],
      description: 'Text alignment',
    },
    animate: {
      control: { type: 'boolean' },
      description: 'Enable mount animation',
    },
    leadingText: {
      control: { type: 'text' },
      description: 'Custom leading text span',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'This is a default paragraph with standard styling and spacing.',
    variant: 'default',
  },
};

export const Variants: Story = {
  render: () => (
    <div className='space-y-6'>
      <Paragraph variant='default'>
        Default paragraph variant with primary text color and standard styling for body content.
      </Paragraph>
      <Paragraph variant='secondary'>
        Secondary paragraph variant with muted text color for supporting content.
      </Paragraph>
      <Paragraph variant='muted'>
        Muted paragraph variant with subtle text color for less important content.
      </Paragraph>
      <Paragraph variant='accent'>
        Accent paragraph variant with brand color for highlighted content.
      </Paragraph>
      <Paragraph variant='lead'>
        Lead paragraph variant with larger text and medium weight for introductory content.
      </Paragraph>
      <Paragraph variant='caption'>
        Caption paragraph variant with smaller text for captions and meta information.
      </Paragraph>
      <Paragraph variant='description'>
        Description paragraph variant for descriptive text and explanations.
      </Paragraph>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All available paragraph variants showing different semantic purposes.',
      },
    },
  },
};

export const Sizes: Story = {
  render: () => (
    <div className='space-y-4'>
      <Paragraph size='sm'>
        Small paragraph text for compact layouts and secondary information.
      </Paragraph>
      <Paragraph size='base'>
        Base paragraph text for standard body content and main text blocks.
      </Paragraph>
      <Paragraph size='lg'>
        Large paragraph text for emphasized content and important information.
      </Paragraph>
      <Paragraph size='xl'>
        Extra large paragraph text for hero sections and prominent content.
      </Paragraph>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Paragraph size options for different hierarchy levels.',
      },
    },
  },
};

export const Spacing: Story = {
  render: () => (
    <div>
      <Paragraph spacing='tight'>
        This paragraph has tight spacing (mb-2) and is followed by another paragraph.
      </Paragraph>
      <Paragraph spacing='normal'>
        This paragraph has normal spacing (mb-4) and provides standard separation.
      </Paragraph>
      <Paragraph spacing='relaxed'>
        This paragraph has relaxed spacing (mb-6) for more breathing room.
      </Paragraph>
      <Paragraph spacing='loose'>
        This paragraph has loose spacing (mb-8) for maximum separation.
      </Paragraph>
      <Paragraph spacing='none'>
        This paragraph has no bottom margin and flows directly into the next element.
      </Paragraph>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Bottom margin spacing options for controlling paragraph separation.',
      },
    },
  },
};

export const MaxWidth: Story = {
  render: () => (
    <div className='space-y-6'>
      <Paragraph maxWidth='sm' align='center'>
        Small max-width paragraph centered for compact content.
      </Paragraph>
      <Paragraph maxWidth='lg' align='center'>
        Large max-width paragraph centered for moderate content length that provides good
        readability.
      </Paragraph>
      <Paragraph maxWidth='prose' align='center'>
        Prose max-width paragraph optimized for reading with ideal line length for comfortable text
        consumption and excellent readability across different devices.
      </Paragraph>
      <Paragraph maxWidth='none'>
        No max-width constraint paragraph that spans the full width of its container and can become
        quite wide on larger screens, which may impact readability but is useful for certain
        layouts.
      </Paragraph>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Maximum width constraints for optimal readability.',
      },
    },
  },
};

export const Alignment: Story = {
  render: () => (
    <div className='space-y-4'>
      <Paragraph align='left'>
        Left-aligned paragraph text that flows naturally from the left edge.
      </Paragraph>
      <Paragraph align='center' maxWidth='lg'>
        Center-aligned paragraph text that is centered within its container.
      </Paragraph>
      <Paragraph align='right'>
        Right-aligned paragraph text that flows from the right edge.
      </Paragraph>
      <Paragraph align='justify' maxWidth='2xl'>
        Justified paragraph text that spreads evenly across the line width, creating clean edges on
        both sides. This works best with longer content that spans multiple lines and provides a
        formal, structured appearance.
      </Paragraph>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Text alignment options for different layout needs.',
      },
    },
  },
};

export const WithLeadingText: Story = {
  render: () => (
    <div className='space-y-4'>
      <Paragraph leadingText='Important:'>
        This paragraph includes leading text that is styled differently from the main content.
      </Paragraph>
      <Paragraph leadingText='Note:' variant='secondary'>
        Leading text can be combined with different variants for various purposes.
      </Paragraph>
      <Paragraph leadingText='Pro Tip:' variant='accent'>
        Use leading text to highlight important information or provide context.
      </Paragraph>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Paragraphs with custom leading text for emphasis.',
      },
    },
  },
};

export const WithAnimation: Story = {
  args: {
    children: 'This paragraph animates in when it mounts.',
    variant: 'lead',
    animate: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Paragraph with mount animation enabled.',
      },
    },
  },
};

export const ArticleContent: Story = {
  render: () => (
    <article className='max-w-3xl'>
      <Paragraph variant='lead' maxWidth='2xl' spacing='relaxed'>
        This lead paragraph introduces the article content with larger text and emphasis, setting
        the tone for the following content.
      </Paragraph>
      <Paragraph maxWidth='prose' spacing='normal'>
        This is a standard body paragraph that contains the main content of the article. It uses
        optimal line length for readability and standard spacing between paragraphs.
      </Paragraph>
      <Paragraph maxWidth='prose' spacing='normal'>
        Another body paragraph that continues the content flow. The prose max-width ensures
        comfortable reading across different screen sizes while maintaining proper typography.
      </Paragraph>
      <Paragraph variant='caption' spacing='tight'>
        This caption paragraph provides additional context or metadata about the content above.
      </Paragraph>
    </article>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Example article layout using different paragraph variants.',
      },
    },
  },
};

export const GameDescription: Story = {
  render: () => (
    <div className='p-6 bg-background-tertiary rounded-lg'>
      <Paragraph variant='lead' spacing='relaxed'>
        Welcome to the shadows of Brackwater, where you and your crew of scoundrels pull off heists
        and build your criminal empire.
      </Paragraph>
      <Paragraph variant='description' maxWidth='2xl' spacing='normal'>
        Brackwater is a Forged-in-the-Dark setting about a crew of daring scoundrels seeking their
        fortunes in the canals of a drowned, lantern-lit city.
      </Paragraph>
      <Paragraph variant='muted' size='sm' spacing='none'>
        Create your character, form your crew, and start your criminal enterprise today.
      </Paragraph>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Game-themed content using various paragraph styles.',
      },
    },
  },
};
