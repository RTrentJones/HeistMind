/**
 * usePortal hook
 * Creates and manages portal containers for rendering outside component tree
 */

import { useEffect, useRef } from 'react';

export interface UsePortalOptions {
  /** ID for the portal container */
  id?: string;
  /** Container element to append portal to */
  container?: HTMLElement;
  /** Whether to remove portal on unmount */
  removeOnUnmount?: boolean;
}

/**
 * Hook for creating and managing portal containers
 */
export const usePortal = (options: UsePortalOptions = {}): HTMLElement => {
  const {
    id = 'portal-root',
    container = typeof document !== 'undefined' ? document.body : null,
    removeOnUnmount = true,
  } = options;

  const portalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!container) return;

    // Try to find existing portal
    let portal = document.getElementById(id) as HTMLElement;

    if (!portal) {
      // Create new portal
      portal = document.createElement('div');
      portal.id = id;
      portal.setAttribute('data-portal', 'true');
      container.appendChild(portal);
    }

    portalRef.current = portal;

    return () => {
      if (removeOnUnmount && portal && portal.parentNode) {
        portal.parentNode.removeChild(portal);
      }
    };
  }, [id, container, removeOnUnmount]);

  return portalRef.current || document.createElement('div');
};
