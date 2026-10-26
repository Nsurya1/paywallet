import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { AuthProvider } from '../components/providers/AuthProvider';
import { walletApi } from '../api/walletApi';

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock walletApi
vi.mock('../api/walletApi', () => ({
  walletApi: {
    getWallets: vi.fn(),
    createWallet: vi.fn(),
    getWalletById: vi.fn(),
    getTransactions: vi.fn(),
    topUpWallet: vi.fn(),
  },
}));

describe('DashboardPage Component', () => {
  const mockWallet = {
    id: 'wal_test_1234567890',
    userId: 'usr_rahul',
    currency: 'INR',
    balance: 5000000, // ₹50,000.00
    status: 'ACTIVE' as const,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const mockTransactions = [
    {
      id: 'tx_cred_1',
      walletId: 'wal_test_1234567890',
      type: 'TRANSFER_CREDIT' as const,
      amount: 150000, // ₹1,500.00
      balanceAfter: 5000000,
      status: 'COMPLETED' as const,
      reference: 'Client Payment',
      createdAt: '2026-01-02T10:00:00Z',
    },
    {
      id: 'tx_deb_2',
      walletId: 'wal_test_1234567890',
      type: 'TRANSFER_DEBIT' as const,
      amount: 50000, // ₹500.00
      balanceAfter: 4850000,
      status: 'COMPLETED' as const,
      reference: 'Coffee & Books',
      createdAt: '2026-01-02T12:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(walletApi.getWallets).mockResolvedValue([mockWallet]);
    vi.mocked(walletApi.getTransactions).mockResolvedValue({
      content: mockTransactions,
      page: 0,
      size: 10,
      totalElements: 2,
      totalPages: 1,
      last: true,
      first: true,
    });
  });

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <DashboardPage />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  it('renders greeting, hero wallet card, and masked ID', async () => {
    renderDashboard();

    // Greeting contains "Rahul"
    await waitFor(() => {
      expect(screen.getByText(/Rahul/i)).toBeInTheDocument();
    });

    // Wallet currency and active badge
    expect(screen.getByText(/INR • ACTIVE/i)).toBeInTheDocument();

    // Masked wallet ID format
    expect(screen.getByText(/wal_tes••••7890/i)).toBeInTheDocument();
  });

  it('toggles balance visibility when clicking the eye button', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByLabelText(/hide balance/i)).toBeInTheDocument();
    });

    // Click to hide balance
    const hideBtn = screen.getByLabelText(/hide balance/i);
    fireEvent.click(hideBtn);

    // Expect masked dots to be rendered
    expect(screen.getByText(/••••••••/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/show balance/i)).toBeInTheDocument();

    // Click to show balance again
    fireEvent.click(screen.getByLabelText(/show balance/i));
    expect(screen.getByLabelText(/hide balance/i)).toBeInTheDocument();
  });

  it('copies wallet ID to clipboard on copy button click', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /copy wallet id/i })).toBeInTheDocument();
    });

    const copyBtn = screen.getByRole('button', { name: /copy wallet id/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('wal_test_1234567890');
  });

  it('renders stat cards for Money In and Money Out', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText(/Money In \(This Month\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Money Out \(This Month\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Net Ledger Growth/i)).toBeInTheDocument();
    });
  });

  it('renders velocity chart tabs (7D, 30D, 90D) and switches active tab', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Spending & Cash Velocity')).toBeInTheDocument();
    });

    const tab30D = screen.getByRole('button', { name: '30D' });
    expect(tab30D).toBeInTheDocument();
    fireEvent.click(tab30D);

    const tab90D = screen.getByRole('button', { name: '90D' });
    fireEvent.click(tab90D);
  });

  it('renders recent transactions with credit and debit indicators', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
      expect(screen.getByText(/Coffee & Books/i)).toBeInTheDocument();
    });
  });

  it('opens Add Money modal when clicking the Add Money quick action', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add money/i })).toBeInTheDocument();
    });

    const addMoneyBtn = screen.getByRole('button', { name: /add money/i });
    fireEvent.click(addMoneyBtn);

    await waitFor(() => {
      expect(screen.getByText('Add Money to Wallet')).toBeInTheDocument();
      expect(screen.getByText('Select Deposit Method')).toBeInTheDocument();
    });
  });

  it('opens Request modal when clicking Request quick action', async () => {
    renderDashboard();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /request/i })).toBeInTheDocument();
    });

    const requestBtn = screen.getByRole('button', { name: /request/i });
    fireEvent.click(requestBtn);

    await waitFor(() => {
      expect(screen.getByText('Request Money')).toBeInTheDocument();
      expect(screen.getByText(/Scan to pay via Paywallet App/i)).toBeInTheDocument();
    });
  });
});
