import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { TransactionsPage } from '../pages/TransactionsPage';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { AuthProvider } from '../components/providers/AuthProvider';
import { walletApi } from '../api/walletApi';

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

vi.mock('../api/walletApi', () => ({
  walletApi: {
    getWallets: vi.fn(),
    createWallet: vi.fn(),
    getTransactions: vi.fn(),
  },
}));

describe('TransactionsPage Component', () => {
  const mockWallet = {
    id: 'wal_user_ledger_99',
    userId: 'usr_rahul',
    currency: 'INR',
    balance: 8000000,
    status: 'ACTIVE' as const,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const mockTransactions = [
    {
      id: 'tx_cred_bonus_1',
      walletId: 'wal_user_ledger_99',
      relatedWalletId: 'wal_7b19a42f',
      type: 'TRANSFER_CREDIT' as const,
      amount: 250000, // ₹2,500.00
      balanceAfter: 8000000,
      status: 'COMPLETED' as const,
      reference: 'Q3 Performance Bonus',
      createdAt: '2026-01-02T10:00:00Z',
    },
    {
      id: 'tx_deb_coffee_2',
      walletId: 'wal_user_ledger_99',
      relatedWalletId: 'wal_92c43110',
      type: 'TRANSFER_DEBIT' as const,
      amount: 45000, // ₹450.00
      balanceAfter: 7750000,
      status: 'COMPLETED' as const,
      reference: 'Artisan Coffee Roasters',
      createdAt: '2026-01-02T12:00:00Z',
    },
    {
      id: 'tx_topup_upi_3',
      walletId: 'wal_user_ledger_99',
      type: 'TOPUP' as const,
      amount: 500000, // ₹5,000.00
      balanceAfter: 8250000,
      status: 'COMPLETED' as const,
      reference: 'UPI Instant Top-Up',
      createdAt: '2026-01-03T14:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(walletApi.getWallets).mockResolvedValue([mockWallet]);
    vi.mocked(walletApi.getTransactions).mockResolvedValue({
      content: mockTransactions,
      page: 0,
      size: 10,
      totalElements: 3,
      totalPages: 1,
      last: true,
      first: true,
    });
  });

  const renderTransactionsPage = () => {
    return render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <TransactionsPage />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  it('renders page header, filters bar, and transactions ledger table', async () => {
    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /transaction ledger/i })).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search by id, note/i)).toBeInTheDocument();
      expect(screen.getByText('Q3 Performance Bonus')).toBeInTheDocument();
      expect(screen.getByText('Artisan Coffee Roasters')).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('filters transactions when typing into the search input', async () => {
    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByText('Q3 Performance Bonus')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by id, note/i);
    fireEvent.change(searchInput, { target: { value: 'Coffee' } });

    await waitFor(() => {
      expect(screen.getByText('Artisan Coffee Roasters')).toBeInTheDocument();
      expect(screen.queryByText('Q3 Performance Bonus')).not.toBeInTheDocument();
    });
  });

  it('opens TransactionDrawer with complete ledger details on row click', async () => {
    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByText('Q3 Performance Bonus')).toBeInTheDocument();
    });

    // Click on the row
    fireEvent.click(screen.getByText('Q3 Performance Bonus'));

    // Drawer opens
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Transaction Details' })).toBeInTheDocument();
      expect(screen.getAllByText(/tx_cred_bonus_1/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/double-entry ledger verified in postgresql/i)).toBeInTheDocument();
    });

    // Close drawer
    const closeBtn = screen.getByRole('button', { name: /close drawer/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Transaction Details' })).not.toBeInTheDocument();
    });
  });

  it('exports CSV file when clicking Export CSV button', async () => {
    renderTransactionsPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /export csv/i })).toBeInTheDocument();
    });

    const appendChildSpy = vi.spyOn(document.body, 'appendChild');
    const exportBtn = screen.getByRole('button', { name: /export csv/i });
    fireEvent.click(exportBtn);

    expect(appendChildSpy).toHaveBeenCalled();
  });
});
