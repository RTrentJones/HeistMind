// Re-export all shared stores
export * from './notification-store';
export * from './ui-store';

// Re-export domain stores
export * from '../../features/auth/stores/auth-store';
export * from '../../features/games/stores/games-store';

// Store initialization and cleanup utilities
export const initializeStores = () => {
  // TODO: Implement any necessary store initialization logic here
  // Initialize any stores that need setup
  // This could include setting up store subscriptions, middleware, etc.
};

export const resetAllStores = () => {
  // TODO: Implement any necessary store cleanup logic here
  // Reset all stores to initial state
  // Useful for logout or app reset scenarios
};
