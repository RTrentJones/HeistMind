import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  ErrorBoundary,
  withErrorBoundary,
  useErrorHandler,
  SimpleErrorBoundary,
} from './ErrorBoundary';
import { ErrorFallbacks } from './ErrorFallbacks';
import { Button } from './Button';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { Input } from './Input';

const meta: Meta<typeof ErrorBoundary> = {
  title: 'Components/ErrorBoundary',
  component: ErrorBoundary,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Production-ready error boundary system with detailed error reporting, recovery options, and multiple fallback components for different scenarios.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

// Component that throws an error on command
const BuggyComponent: React.FC<{ shouldThrow?: boolean; errorType?: string }> = ({
  shouldThrow = false,
  errorType = 'render',
}) => {
  if (shouldThrow) {
    if (errorType === 'render') {
      throw new Error('Simulated render error in component');
    } else if (errorType === 'async') {
      setTimeout(() => {
        throw new Error('Simulated async error');
      }, 100);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Working Component</CardTitle>
      </CardHeader>
      <CardContent>
        <p>This component is working normally!</p>
        <Badge variant='success'>All good</Badge>
      </CardContent>
    </Card>
  );
};

// Interactive component with error handler hook
const InteractiveErrorDemo: React.FC = () => {
  const [count, setCount] = useState(0);
  const handleError = useErrorHandler();

  const triggerError = () => {
    try {
      if (count > 5) {
        throw new Error('Count exceeded maximum value!');
      }
    } catch (error) {
      handleError(error as Error, 'Interactive button click');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interactive Error Demo</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <p>Click count: {count}</p>
        <div className='flex gap-2'>
          <Button onClick={() => setCount(c => c + 1)}>Increment</Button>
          <Button onClick={triggerError} variant='destructive'>
            Check Limit (throws at 6+)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Form component that can error
const ErrorProneForm: React.FC<{ shouldError?: boolean }> = ({ shouldError }) => {
  if (shouldError) {
    throw new Error('Form validation failed with invalid data structure');
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Form</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        <Input label='Name' placeholder='Enter your name' />
        <Input label='Email' type='email' placeholder='Enter your email' />
        <Button>Submit Form</Button>
      </CardContent>
    </Card>
  );
};

export const Default: Story = {
  render: () => {
    const [shouldThrow, setShouldThrow] = useState(false);

    return (
      <div className='space-y-4'>
        <Button
          onClick={() => setShouldThrow(!shouldThrow)}
          variant={shouldThrow ? 'destructive' : 'default'}
        >
          {shouldThrow ? 'Fix Component' : 'Break Component'}
        </Button>

        <ErrorBoundary>
          <BuggyComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      </div>
    );
  },
};

export const CustomFallbacks: Story = {
  render: () => {
    const [errors, setErrors] = useState({
      minimal: false,
      form: false,
      character: false,
      page: false,
    });

    const toggleError = (type: keyof typeof errors) => {
      setErrors(prev => ({ ...prev, [type]: !prev[type] }));
    };

    return (
      <div className='space-y-6'>
        <div className='flex flex-wrap gap-2'>
          {Object.keys(errors).map(type => (
            <Button
              key={type}
              size='sm'
              variant={errors[type as keyof typeof errors] ? 'destructive' : 'outline'}
              onClick={() => toggleError(type as keyof typeof errors)}
            >
              Toggle {type} error
            </Button>
          ))}
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <h3 className='text-sm font-medium'>Minimal Fallback</h3>
            <ErrorBoundary fallback={ErrorFallbacks.Minimal}>
              <BuggyComponent shouldThrow={errors.minimal} />
            </ErrorBoundary>
          </div>

          <div className='space-y-2'>
            <h3 className='text-sm font-medium'>Form Fallback</h3>
            <ErrorBoundary fallback={ErrorFallbacks.Form}>
              <ErrorProneForm shouldError={errors.form} />
            </ErrorBoundary>
          </div>

          <div className='space-y-2'>
            <h3 className='text-sm font-medium'>Character Fallback</h3>
            <ErrorBoundary fallback={ErrorFallbacks.Character}>
              <BuggyComponent shouldThrow={errors.character} />
            </ErrorBoundary>
          </div>

          <div className='space-y-2'>
            <h3 className='text-sm font-medium'>Page Fallback</h3>
            <div className='h-64 border border-zinc-700 rounded overflow-hidden'>
              <ErrorBoundary fallback={ErrorFallbacks.Page}>
                <BuggyComponent shouldThrow={errors.page} />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    );
  },
};

export const WithErrorBoundaryHOC: Story = {
  render: () => {
    const [shouldThrow, setShouldThrow] = useState(false);

    // Create wrapped component with error boundary
    const SafeBuggyComponent = withErrorBoundary(BuggyComponent, {
      fallback: ErrorFallbacks.Storybook,
      onError: error => console.log('HOC caught error:', error.message),
    });

    return (
      <div className='space-y-4'>
        <Button onClick={() => setShouldThrow(!shouldThrow)}>
          {shouldThrow ? 'Fix Component' : 'Break Component'}
        </Button>

        <SafeBuggyComponent shouldThrow={shouldThrow} />
      </div>
    );
  },
};

export const SimpleErrorBoundaryDemo: Story = {
  render: () => {
    const [shouldThrow, setShouldThrow] = useState(false);

    return (
      <div className='space-y-4'>
        <Button onClick={() => setShouldThrow(!shouldThrow)}>
          {shouldThrow ? 'Fix Component' : 'Break Component'}
        </Button>

        <SimpleErrorBoundary
          fallback={
            <div className='p-4 bg-red-900/20 border border-red-500/40 rounded text-red-400'>
              Something went wrong with this component.
            </div>
          }
        >
          <BuggyComponent shouldThrow={shouldThrow} />
        </SimpleErrorBoundary>
      </div>
    );
  },
};

export const ErrorHandlerHook: Story = {
  render: () => (
    <ErrorBoundary>
      <InteractiveErrorDemo />
    </ErrorBoundary>
  ),
};

export const NestedErrorBoundaries: Story = {
  render: () => {
    const [errors, setErrors] = useState({
      outer: false,
      inner: false,
    });

    return (
      <div className='space-y-4'>
        <div className='flex gap-2'>
          <Button size='sm' onClick={() => setErrors(prev => ({ ...prev, outer: !prev.outer }))}>
            Toggle Outer Error
          </Button>
          <Button size='sm' onClick={() => setErrors(prev => ({ ...prev, inner: !prev.inner }))}>
            Toggle Inner Error
          </Button>
        </div>

        <ErrorBoundary title='Outer Error Boundary' fallback={ErrorFallbacks.Character}>
          <Card>
            <CardHeader>
              <CardTitle>Outer Component</CardTitle>
            </CardHeader>
            <CardContent>
              <BuggyComponent shouldThrow={errors.outer} />

              <div className='mt-4'>
                <ErrorBoundary title='Inner Error Boundary' fallback={ErrorFallbacks.Minimal}>
                  <Card variant='glass'>
                    <CardContent className='p-4'>
                      <p className='text-sm mb-2'>Inner component</p>
                      <BuggyComponent shouldThrow={errors.inner} />
                    </CardContent>
                  </Card>
                </ErrorBoundary>
              </div>
            </CardContent>
          </Card>
        </ErrorBoundary>
      </div>
    );
  },
};

export const ErrorDetails: Story = {
  render: () => {
    const [shouldThrow, setShouldThrow] = useState(false);

    return (
      <div className='space-y-4'>
        <Button onClick={() => setShouldThrow(!shouldThrow)}>
          {shouldThrow ? 'Fix Component' : 'Break Component'}
        </Button>

        <ErrorBoundary
          showDetailsDefault={true}
          onError={(error, errorInfo) => {
            console.log('Error logged:', { error, errorInfo });
          }}
        >
          <BuggyComponent shouldThrow={shouldThrow} />
        </ErrorBoundary>
      </div>
    );
  },
};
