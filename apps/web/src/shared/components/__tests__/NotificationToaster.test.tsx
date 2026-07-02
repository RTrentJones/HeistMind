import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { useNotificationStore } from '@/shared/stores/notification-store';
import { NotificationToaster } from '../NotificationToaster';

describe('NotificationToaster', () => {
  beforeEach(() => {
    useNotificationStore.getState().clear();
  });

  it('renders nothing with no notifications', () => {
    const { container } = render(<NotificationToaster />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a dispatched toast and dismisses it', async () => {
    render(<NotificationToaster />);

    act(() => {
      useNotificationStore.getState().error('Roll failed', 'The dice are cursed');
    });

    expect(screen.getByText('Roll failed')).toBeInTheDocument();
    expect(screen.getByText('The dice are cursed')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(useNotificationStore.getState().notifications).toHaveLength(0);
  });
});
