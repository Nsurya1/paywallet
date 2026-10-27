import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { SettingsPage } from '../pages/SettingsPage';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { AuthProvider } from '../components/providers/AuthProvider';
import { webhookApi } from '../api/webhookApi';

vi.mock('../api/webhookApi', () => ({
  webhookApi: {
    getSubscriptions: vi.fn(),
    createSubscription: vi.fn(),
    deactivateSubscription: vi.fn(),
    testDispatch: vi.fn(),
  },
}));

describe('SettingsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(webhookApi.getSubscriptions).mockResolvedValue([
      {
        id: 'sub_test_1',
        targetUrl: 'https://api.merchant.com/webhook',
        eventType: 'WALLET_TRANSFERRED',
        secret: 'whsec_secret123',
        active: true,
        createdAt: new Date().toISOString(),
      },
    ]);
  });

  const renderSettingsPage = () => {
    return render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <SettingsPage />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  it('renders page header and profile form on default tab', () => {
    renderSettingsPage();

    expect(screen.getByRole('heading', { name: /settings & preferences/i })).toBeInTheDocument();
    expect(screen.getByText('User Profile')).toBeInTheDocument();
    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('navigates to Security & Password tab and renders password strength meter', async () => {
    renderSettingsPage();

    const secTab = screen.getByRole('button', { name: /security & password/i });
    fireEvent.click(secTab);

    expect(screen.getByRole('heading', { name: /change password/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/current password/i)).toBeInTheDocument();

    const newPassInput = screen.getByLabelText(/^new password$/i);
    fireEvent.change(newPassInput, { target: { value: 'Secret@123' } });

    await waitFor(() => {
      expect(screen.getByText('Password strength')).toBeInTheDocument();
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });
  });

  it('navigates to Theme & Appearance tab and switches theme options', () => {
    renderSettingsPage();

    const themeTab = screen.getByRole('button', { name: /theme & appearance/i });
    fireEvent.click(themeTab);

    expect(screen.getByText('Light Mode')).toBeInTheDocument();
    expect(screen.getByText('Dark Mode')).toBeInTheDocument();
    expect(screen.getByText('System Preference')).toBeInTheDocument();

    const darkBtn = screen.getByRole('button', { name: /dark mode/i });
    fireEvent.click(darkBtn);
  });

  it('navigates to Webhook URLs tab, displays subscriptions and triggers test dispatch', async () => {
    vi.mocked(webhookApi.testDispatch).mockResolvedValueOnce({
      status: 200,
      durationMs: 38,
    });

    renderSettingsPage();

    const webhooksTab = screen.getByRole('button', { name: /webhook urls/i });
    fireEvent.click(webhooksTab);

    await waitFor(() => {
      expect(screen.getByText('Register Webhook Endpoint')).toBeInTheDocument();
      expect(screen.getByText('https://api.merchant.com/webhook')).toBeInTheDocument();
    });

    const testBtn = screen.getByRole('button', { name: /test webhook/i });
    fireEvent.click(testBtn);

    await waitFor(() => {
      expect(screen.getByText(/webhook delivery succeeded/i)).toBeInTheDocument();
      expect(screen.getByText(/status: 200 ok/i)).toBeInTheDocument();
    });
  });

  it('navigates to Active Sessions tab and renders connected devices', () => {
    renderSettingsPage();

    const sessionsTab = screen.getByRole('button', { name: /active sessions/i });
    fireEvent.click(sessionsTab);

    expect(screen.getByText(/Active Sessions & Devices/i)).toBeInTheDocument();
    expect(screen.getByText(/Windows 11 • Chrome 128/i)).toBeInTheDocument();
    expect(screen.getByText('THIS DEVICE')).toBeInTheDocument();
    expect(screen.getByText(/iPhone 15 Pro • Safari iOS 18/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /terminate other sessions/i })).toBeInTheDocument();
  });
});
