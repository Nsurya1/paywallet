import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { TransferPage } from '../pages/TransferPage';
import { ThemeProvider } from '../components/providers/ThemeProvider';
import { AuthProvider } from '../components/providers/AuthProvider';
import { walletApi } from '../api/walletApi';
import { transferApi } from '../api/transferApi';

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
  },
});

// Mock print
window.print = vi.fn();

// Mock APIs
vi.mock('../api/walletApi', () => ({
  walletApi: {
    getWallets: vi.fn(),
    createWallet: vi.fn(),
    topUpWallet: vi.fn(),
  },
}));

vi.mock('../api/transferApi', () => ({
  transferApi: {
    executeTransfer: vi.fn(),
  },
}));

vi.mock('../lib/confetti', () => ({
  triggerConfetti: vi.fn(),
}));

describe('TransferPage Component', () => {
  const mockWallet = {
    id: 'wal_sender_123',
    userId: 'usr_rahul',
    currency: 'INR',
    balance: 500000, // ₹5,000.00
    status: 'ACTIVE' as const,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(walletApi.getWallets).mockResolvedValue([mockWallet]);
  });

  const renderTransferPage = () => {
    return render(
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <TransferPage />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    );
  };

  it('renders Step 1: recipient avatars and wallet ID input', async () => {
    renderTransferPage();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /send money/i })).toBeInTheDocument();
      expect(screen.getByText('Select Recipient')).toBeInTheDocument();
    });

    expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    expect(screen.getByText('Arjun Patel')).toBeInTheDocument();
    expect(screen.getByLabelText(/enter recipient wallet id/i)).toBeInTheDocument();
  });

  it('clicking a recent recipient avatar advances to Step 2 with their details', async () => {
    renderTransferPage();

    await waitFor(() => {
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Priya Sharma'));

    await waitFor(() => {
      expect(screen.getByText('Specify Transfer Amount')).toBeInTheDocument();
      expect(screen.getByText(/Sending to/i)).toBeInTheDocument();
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    });
  });

  it('shows insufficient balance warning when amount exceeds wallet balance', async () => {
    renderTransferPage();

    await waitFor(() => {
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Priya Sharma'));

    await waitFor(() => {
      expect(screen.getByText('Specify Transfer Amount')).toBeInTheDocument();
    });

    // Enter ₹10,000 when wallet balance is ₹5,000
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '10000' } });

    await waitFor(() => {
      expect(screen.getByText(/Insufficient balance!/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /\+ add money/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /review & confirm/i })).toBeDisabled();
    });
  });

  it('proceeds from Step 2 to Step 3 and renders breakdown with idempotency pill', async () => {
    renderTransferPage();

    await waitFor(() => {
      expect(screen.getByText('Arjun Patel')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Arjun Patel'));

    await waitFor(() => {
      expect(screen.getByText('Specify Transfer Amount')).toBeInTheDocument();
    });

    // Default amount is ₹500
    const reviewBtn = screen.getByRole('button', { name: /review & confirm/i });
    expect(reviewBtn).not.toBeDisabled();
    fireEvent.click(reviewBtn);

    await waitFor(() => {
      expect(screen.getByText('Review & Confirm Transfer')).toBeInTheDocument();
      expect(screen.getByText('Recipient Payee')).toBeInTheDocument();
      expect(screen.getByText('Arjun Patel')).toBeInTheDocument();
      expect(screen.getByText('Idempotency-Key Protocol')).toBeInTheDocument();
      expect(screen.getByText('REUSED ON RETRY')).toBeInTheDocument();
    });
  });

  it('handles 409 conflict: in-flight processing message', async () => {
    vi.mocked(transferApi.executeTransfer).mockRejectedValueOnce({
      response: {
        status: 409,
        data: { message: 'Transfer in flight' },
      },
    });

    renderTransferPage();

    await waitFor(() => {
      expect(screen.getByText('Neha Gupta')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Neha Gupta'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /review & confirm/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /review & confirm/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm & authorize/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm & authorize/i }));

    await waitFor(() => {
      expect(screen.getByText(/409 Conflict: Settlement in Progress/i)).toBeInTheDocument();
    });
  });

  it('handles server glitch: enables safe idempotent retry with same key', async () => {
    vi.mocked(transferApi.executeTransfer).mockRejectedValueOnce({
      response: {
        status: 500,
        data: { message: 'Database connection timeout' },
      },
    });

    renderTransferPage();

    await waitFor(() => {
      expect(screen.getByText('Vikram Rao')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Vikram Rao'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /review & confirm/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /review & confirm/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm & authorize/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm & authorize/i }));

    await waitFor(() => {
      expect(screen.getByText(/Idempotent Retry Available/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry transfer safely/i })).toBeInTheDocument();
    });
  });

  it('completes transfer, renders digital receipt, and supports PDF download & share', async () => {
    vi.mocked(transferApi.executeTransfer).mockResolvedValueOnce({
      transferId: 'TX-CONFIRMED-8812',
      fromWalletId: 'wal_sender_123',
      toWalletId: 'wal_priya_89a2b',
      amount: 50000,
      currency: 'INR',
      status: 'COMPLETED',
      reference: 'Dinner Split',
      createdAt: new Date().toISOString(),
    });

    renderTransferPage();

    await waitFor(() => {
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Priya Sharma'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /review & confirm/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /review & confirm/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm & authorize/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm & authorize/i }));

    // Expect Step 4 receipt
    await waitFor(() => {
      expect(screen.getByText('Transfer Successful!')).toBeInTheDocument();
      expect(screen.getByText('TX-CONFIRMED-8812')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /download pdf/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share receipt/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /new transfer/i })).toBeInTheDocument();
    });

    // Test print trigger
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));
    expect(window.print).toHaveBeenCalled();

    // Test share trigger
    fireEvent.click(screen.getByRole('button', { name: /share receipt/i }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('Paywallet Transfer Confirmed')
    );
  });
});
