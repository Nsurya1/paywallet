import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { NotificationsPage } from '../pages/NotificationsPage';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { AuthProvider } from '../components/providers/AuthProvider';

describe('NotificationsPage Component', () => {
  const renderNotificationsPage = () => {
    return render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <NotificationsPage />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  it('renders page header with unread count and notification cards', () => {
    renderNotificationsPage();

    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByText(/3 unread/i)).toBeInTheDocument();
    expect(screen.getByText('Received Payment')).toBeInTheDocument();
    expect(screen.getByText('New Device Sign-in')).toBeInTheDocument();
  });

  it('filters notifications when clicking tabs', async () => {
    renderNotificationsPage();

    const securityTab = screen.getByRole('button', { name: 'Security' });
    fireEvent.click(securityTab);

    expect(screen.getByText('New Device Sign-in')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText('Received Payment')).not.toBeInTheDocument();
    });
  });

  it('marks single notification as read on check button click', () => {
    renderNotificationsPage();

    const markReadButtons = screen.getAllByRole('button', { name: /mark as read/i });
    expect(markReadButtons.length).toBeGreaterThan(0);

    fireEvent.click(markReadButtons[0]);

    // Unread count should decrease to 2
    expect(screen.getByText(/2 unread/i)).toBeInTheDocument();
  });

  it('marks all notifications as read when clicking mark all as read', () => {
    renderNotificationsPage();

    const markAllBtn = screen.getByRole('button', { name: /mark all as read/i });
    fireEvent.click(markAllBtn);

    expect(screen.queryByText(/\d+\s+unread/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark all as read/i })).not.toBeInTheDocument();
  });

  it('dismisses notification when clicking trash icon', async () => {
    renderNotificationsPage();

    expect(screen.getByText('Received Payment')).toBeInTheDocument();
    const dismissButtons = screen.getAllByRole('button', { name: /dismiss notification/i });
    fireEvent.click(dismissButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('Received Payment')).not.toBeInTheDocument();
    });
  });
});
