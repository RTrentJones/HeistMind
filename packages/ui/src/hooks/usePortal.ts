/**
 * usePortal hook
 * Creates and manages portal containers for rendering outside component tree
 */

import { useEffect, useRef, useState } from 'react';
import { ID_PATTERNS } from '../lib/constants';

export interface UsePortalOptions {
  /** ID for the portal container */
  id?: string;
  /** Container element to append portal to */
  container?: HTMLElement;
  /** Whether to remove portal on unmount */
  removeOnUnmount?: boolean;
  /** Custom CSS classes for the portal */
  className?: string;
  /** z-index for the portal */
  zIndex?: number;
}

/**
 * Validates portal ID to prevent XSS and ensure valid DOM IDs
 */
function validatePortalId(id: string): void {
  if (typeof id !== 'string') {
    throw new Error('Portal ID must be a string');
  }

  if (id.length === 0) {
    throw new Error('Portal ID cannot be empty');
  }

  if (id.length > ID_PATTERNS.MAX_PREFIX_LENGTH) {
    throw new Error(`Portal ID cannot exceed ${ID_PATTERNS.MAX_PREFIX_LENGTH} characters`);
  }

  if (!ID_PATTERNS.PREFIX_REGEX.test(id)) {
    throw new Error(
      'Portal ID must start with a letter and contain only letters, numbers, hyphens, and underscores'
    );
  }
}

/**
 * Hook for creating and managing portal containers
 */
export const usePortal = (options: UsePortalOptions = {}): HTMLElement | null => {
  const {
    id = 'portal-root',
    container = typeof document !== 'undefined' ? document.body : null,
    removeOnUnmount = true,
    className,
    zIndex,
  } = options;

  const portalRef = useRef<HTMLElement | null>(null);
  const [isReady, setIsReady] = useState(false);
  const createdByThisHookRef = useRef(false);

  useEffect(() => {
    // Server-side rendering guard
    if (typeof document === 'undefined' || !container) {
      return;
    }

    try {
      // Validate the portal ID
      validatePortalId(id);

      // Try to find existing portal
      let portal = document.getElementById(id) as HTMLElement;

      if (!portal) {
        // Create new portal
        portal = document.createElement('div');
        portal.id = id;
        portal.setAttribute('data-portal', 'true');
        portal.setAttribute('role', 'presentation');

        // Apply custom styling
        if (className) {
          portal.className = className;
        }

        if (zIndex !== undefined) {
          portal.style.zIndex = String(zIndex);
        }

        // Set default styles for accessibility
        portal.style.position = 'absolute';
        portal.style.top = '0';
        portal.style.left = '0';

        container.appendChild(portal);
        createdByThisHookRef.current = true;
      } else {
        createdByThisHookRef.current = false;
      }

      portalRef.current = portal;
      setIsReady(true);
    } catch (error) {
      console.error('Failed to create portal:', error);
      portalRef.current = null;
      setIsReady(false);
    }

    return () => {
      if (
        removeOnUnmount &&
        portalRef.current &&
        portalRef.current.parentNode &&
        createdByThisHookRef.current
      ) {
        try {
          portalRef.current.parentNode.removeChild(portalRef.current);
        } catch (error) {
          console.warn('Failed to remove portal:', error);
        }
      }
      setIsReady(false);
    };
  }, [id, container, removeOnUnmount, className, zIndex]);

  // Return null until portal is ready to prevent hydration mismatches
  return isReady ? portalRef.current : null;
};
