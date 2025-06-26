import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { vi, beforeAll, afterAll } from 'vitest';

// Note: jest-axe integration moved to individual test files to avoid Vitest compatibility issues

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  // Show helpful suggestions when queries fail
  getElementError: (message, container) => {
    const error = new Error(message);
    error.name = 'TestingLibraryElementError';
    error.stack = null;
    return error;
  },
});

// Global test utilities for UI components
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

global.matchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock window.scrollTo
global.scrollTo = vi.fn();

// Mock PointerEvent for motion-dom compatibility
if (!global.PointerEvent) {
  global.PointerEvent = class PointerEvent extends Event {
    pointerId: number;
    width: number;
    height: number;
    pressure: number;
    tangentialPressure: number;
    tiltX: number;
    tiltY: number;
    twist: number;
    pointerType: string;
    isPrimary: boolean;

    constructor(type: string, options: any = {}) {
      super(type, options);
      this.pointerId = options.pointerId || 1;
      this.width = options.width || 1;
      this.height = options.height || 1;
      this.pressure = options.pressure || 0;
      this.tangentialPressure = options.tangentialPressure || 0;
      this.tiltX = options.tiltX || 0;
      this.tiltY = options.tiltY || 0;
      this.twist = options.twist || 0;
      this.pointerType = options.pointerType || 'mouse';
      this.isPrimary = options.isPrimary || true;
    }
  } as any;
}

// Mock HTMLElement methods
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: vi.fn(),
  writable: true,
});

// Mock getComputedStyle for color contrast testing
const originalGetComputedStyle = window.getComputedStyle;
global.getComputedStyle = (element: Element) => {
  const computedStyle = originalGetComputedStyle(element);
  return {
    ...computedStyle,
    getPropertyValue: (property: string) => {
      switch (property) {
        case 'backgroundColor':
          return 'rgb(255, 255, 255)';
        case 'color':
          return 'rgb(0, 0, 0)';
        case 'display':
          return 'block';
        case 'visibility':
          return 'visible';
        default:
          return '';
      }
    },
    // Ensure color values are available for testing
    backgroundColor: computedStyle.backgroundColor || 'rgb(255, 255, 255)',
    color: computedStyle.color || 'rgb(0, 0, 0)',
  };
};

// Silence console warnings in tests unless explicitly testing them
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
