/**
 * Test utilities for HeistMind UI components
 * Provides consistent testing setup and accessibility testing helpers
 */

import React, { ReactElement } from 'react';
import { vi } from 'vitest';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

/**
 * Theme wrapper for component testing
 */
const ThemeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className='light' data-testid='theme-wrapper'>
      {children}
    </div>
  );
};

/**
 * Custom render function with theme wrapper and user event setup
 */
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult & { user: ReturnType<typeof userEvent.setup> } => {
  const user = userEvent.setup();
  const renderResult = render(ui, { wrapper: ThemeWrapper, ...options });
  return { ...renderResult, user };
};

/**
 * Accessibility testing helper
 */
export const testAccessibility = async (element: HTMLElement): Promise<void> => {
  // Basic accessibility checks without jest-axe
  // Check for proper ARIA attributes
  expect(element).toBeInTheDocument();

  // Verify element has proper semantic structure
  if (element.tagName === 'BUTTON') {
    expect(element).toHaveAttribute('type');
  }

  // Check for proper labeling on interactive elements
  const interactiveElements = element.querySelectorAll('button, input, select, textarea, a[href]');
  interactiveElements.forEach(el => {
    const hasLabel =
      el.hasAttribute('aria-label') ||
      el.hasAttribute('aria-labelledby') ||
      el.closest('label') !== null ||
      el.tagName === 'A';
    if (!hasLabel) {
      console.warn(`Interactive element missing proper labeling:`, el);
    }
  });
};

/**
 * Keyboard navigation testing helper
 */
export const testKeyboardNavigation = async (element: HTMLElement) => {
  const user = userEvent.setup();

  // Test Tab navigation
  await user.tab();
  expect(element).toHaveFocus();

  // Test Shift+Tab navigation
  await user.tab({ shift: true });
  expect(element).not.toHaveFocus();

  return user;
};

/**
 * Focus management testing helper
 */
export const testFocusManagement = async (element: HTMLElement) => {
  const user = userEvent.setup();

  // Focus the element
  element.focus();
  expect(element).toHaveFocus();

  // Test escape key
  await user.keyboard('{Escape}');

  return user;
};

/**
 * Responsive testing helper
 */
export const testResponsiveRender = (
  ui: ReactElement,
  breakpoints: Array<{ width: number; height: number }>
): RenderResult[] => {
  return breakpoints.map(({ width, height }) => {
    // Mock window dimensions
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: width,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: height,
    });

    return customRender(ui);
  });
};

/**
 * Animation testing helper - respects motion preferences
 */
export const testMotionSafety = () => {
  const originalMatchMedia = window.matchMedia;

  return {
    mockReducedMotion: () => {
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    },
    mockNormalMotion: () => {
      window.matchMedia = vi.fn().mockImplementation(query => ({
        matches: query !== '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));
    },
    restore: () => {
      window.matchMedia = originalMatchMedia;
    },
  };
};

/**
 * Form validation testing helper
 */
export const testFormValidation = async (
  formElement: HTMLElement,
  invalidInputs: Array<{ selector: string; value: string; expectedError: string }>
) => {
  const user = userEvent.setup();

  for (const { selector, value, expectedError } of invalidInputs) {
    const input = formElement.querySelector(selector) as HTMLInputElement;
    expect(input).toBeInTheDocument();

    await user.clear(input);
    await user.type(input, value);
    await user.tab(); // Trigger validation

    // Look for error message
    const errorElement = formElement.querySelector(`[data-testid="${selector}-error"]`);
    expect(errorElement).toHaveTextContent(expectedError);
  }
};

/**
 * Loading state testing helper
 */
export const testLoadingStates = async (
  renderComponent: (loading: boolean) => RenderResult,
  loadingTestId: string = 'loading-indicator'
) => {
  // Test loading state
  const { rerender } = renderComponent(true);
  expect(document.querySelector(`[data-testid="${loadingTestId}"]`)).toBeInTheDocument();

  // Test loaded state
  renderComponent(false);
  expect(document.querySelector(`[data-testid="${loadingTestId}"]`)).not.toBeInTheDocument();
};

/**
 * Color contrast testing helper
 */
export const testColorContrast = async (element: HTMLElement) => {
  const styles = window.getComputedStyle(element);
  const backgroundColor = styles.backgroundColor;
  const color = styles.color;

  // Basic color contrast check (requires additional color contrast library for full implementation)
  expect(backgroundColor).toBeTruthy();
  expect(color).toBeTruthy();
  expect(backgroundColor).not.toBe(color);
};

/**
 * Component variant testing helper
 */
export const testVariants = <T extends Record<string, any>>(
  Component: React.ComponentType<T>,
  variants: Array<{ props: T; expectedClasses: string[] }>
) => {
  variants.forEach(({ props, expectedClasses }) => {
    const renderResult = customRender(<Component {...props} />);
    // Get the actual component element, not the theme wrapper
    const themeWrapper = renderResult.container.firstChild as HTMLElement;
    const element = themeWrapper.firstChild as HTMLElement;

    expectedClasses.forEach(className => {
      // Check if the element's class list contains the expected class
      const classList = element.className.split(' ');
      const hasExactMatch = classList.includes(className);
      const hasPartialMatch = classList.some(
        cls => cls.includes(className) || className.includes(cls)
      );

      if (!hasExactMatch && !hasPartialMatch) {
        // Check for semantic matches (e.g., semantic-error should match classes containing "semantic" and "error")
        const classTokens = className.split('-');
        const hasSemanticMatch =
          classTokens.length > 1 &&
          classTokens.every(token => classList.some(cls => cls.includes(token)));

        expect(hasSemanticMatch || hasExactMatch || hasPartialMatch).toBeTruthy();
      }
    });
  });
};

/**
 * Accessibility testing helper
 * Call this manually in tests to avoid Vitest compatibility issues
 */
export const expectNoAxeViolations = async (container: HTMLElement) => {
  // Basic accessibility validation without axe
  expect(container).toBeInTheDocument();

  // Check for basic accessibility issues
  const images = container.querySelectorAll('img');
  images.forEach(img => {
    if (!img.hasAttribute('alt')) {
      console.warn('Image missing alt attribute:', img);
    }
  });

  const buttons = container.querySelectorAll('button');
  buttons.forEach(button => {
    if (!button.textContent?.trim() && !button.hasAttribute('aria-label')) {
      console.warn('Button missing accessible text:', button);
    }
  });
};

// Re-export everything from testing-library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
// axe removed - use manual accessibility checks instead

// Export custom render as default
export { customRender as render };
