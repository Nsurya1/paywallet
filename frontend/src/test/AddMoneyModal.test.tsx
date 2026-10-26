import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AddMoneyModal } from '../features/dashboard/AddMoneyModal';
import { walletApi } from '../api/walletApi';

// Mock walletApi
vi.mock('../api/walletApi', () => ({
  walletApi: {
    topUpWallet: vi.fn(),
  },
}));

// Mock confetti
vi.mock('../lib/confetti', () => ({
  triggerConfetti: vi.fn(),
}));

describe('AddMoneyModal Component', () => {
  const mockWallet = {
    id: 'wal_test_987654321',
    userId: 'usr_rahul',
    currency: 'INR',
    balance: 100000,
    status: 'ACTIVE' as const,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(walletApi.topUpWallet).mockResolvedValue({
      transactionId: 'tx_topup_success_99',
      walletId: 'wal_test_987654321',
      amount: 500000,
      currency: 'INR',
      newBalance: 600000,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    });
  });

  const renderModal = (isOpen = true) => {
    return render(
      <AddMoneyModal
        isOpen={isOpen}
        onClose={mockOnClose}
        wallet={mockWallet}
        onSuccess={mockOnSuccess}
      />
    );
  };

  it('renders input step with amount input, quick chips, and payment methods', () => {
    renderModal();

    expect(screen.getByText('Add Money to Wallet')).toBeInTheDocument();
    expect(screen.getByLabelText(/enter amount/i)).toBeInTheDocument();
    expect(screen.getByText('+₹500')).toBeInTheDocument();
    expect(screen.getByText('+₹1,000')).toBeInTheDocument();
    expect(screen.getByText('+₹5,000')).toBeInTheDocument();
    expect(screen.getByText('+₹10,000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review & confirm/i })).toBeInTheDocument();
  });

  it('updates amount when clicking quick chips', () => {
    renderModal();

    const chip5000 = screen.getByText('+₹5,000');
    fireEvent.click(chip5000);

    const amountInput = screen.getByLabelText(/enter amount/i) as HTMLInputElement;
    expect(amountInput.value).toBe('5000');
    expect(screen.getByText(/5,00,000 paise|500,000 paise/i)).toBeInTheDocument();
  });

  it('shows live validation error for invalid amounts', () => {
    renderModal();

    const amountInput = screen.getByLabelText(/enter amount/i);
    fireEvent.change(amountInput, { target: { value: '0' } });

    expect(screen.getByText(/please enter an amount greater than ₹0/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review & confirm/i })).toBeDisabled();
  });

  it('transitions through review step, executes top-up and displays success screen', async () => {
    renderModal();

    // Select ₹5,000 chip
    fireEvent.click(screen.getByText('+₹5,000'));

    // Click Review & Confirm
    const reviewBtn = screen.getByRole('button', { name: /review & confirm/i });
    fireEvent.click(reviewBtn);

    // Verify Review step content
    await waitFor(() => {
      expect(screen.getByText('Deposit Amount')).toBeInTheDocument();
      expect(screen.getByText('Authorize & Add Funds')).toBeInTheDocument();
    });

    // Authorize & Add Funds
    const authorizeBtn = screen.getByRole('button', { name: /authorize & add funds/i });
    fireEvent.click(authorizeBtn);

    // Verify topUpWallet API was called
    await waitFor(() => {
      expect(walletApi.topUpWallet).toHaveBeenCalledWith(
        mockWallet.id,
        500000,
        expect.stringContaining('GATEWAY-UPI'),
        expect.any(String)
      );
    });

    // Verify Success screen
    await waitFor(() => {
      expect(screen.getByText('Money Added Successfully!')).toBeInTheDocument();
      expect(screen.getByText(/\+ ₹5,000\.00/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
    });

    expect(mockOnSuccess).toHaveBeenCalled();
  });
});
