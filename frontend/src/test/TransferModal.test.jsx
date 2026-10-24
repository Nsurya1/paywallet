import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import TransferModal from '../components/TransferModal';
import { ToastProvider } from '../context/ToastContext';
import { transferApi } from '../api/transferApi';

vi.mock('../api/transferApi', () => ({
  transferApi: {
    executeTransfer: vi.fn(),
  },
}));

describe('TransferModal Component', () => {
  const mockWallet = {
    id: 'wallet-1111-2222-3333',
    balance: 50000, // ₹500.00
    currency: 'INR',
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderModal = (props = {}) => {
    return render(
      <ToastProvider>
        <TransferModal
          isOpen={true}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          wallet={mockWallet}
          {...props}
        />
      </ToastProvider>
    );
  };

  it('renders modal header, balance context, and form fields when open', () => {
    renderModal();

    expect(screen.getByText('Concurrency-Safe Transfer')).toBeInTheDocument();
    expect(screen.getByText(mockWallet.id)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. b82898cf/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Transfer/i })).toBeInTheDocument();
  });

  it('does not render modal contents when isOpen is false', () => {
    render(
      <ToastProvider>
        <TransferModal
          isOpen={false}
          onClose={mockOnClose}
          onSuccess={mockOnSuccess}
          wallet={mockWallet}
        />
      </ToastProvider>
    );

    expect(screen.queryByText('Concurrency-Safe Transfer')).not.toBeInTheDocument();
  });

  it('disables submit button and shows loading state when transfer is in flight', async () => {
    let resolveTransfer;
    transferApi.executeTransfer.mockReturnValue(
      new Promise((resolve) => {
        resolveTransfer = resolve;
      })
    );

    renderModal();

    const recipientInput = screen.getByPlaceholderText(/e\.g\. b82898cf/i);
    fireEvent.change(recipientInput, { target: { value: 'wallet-9999-8888-7777' } });

    const submitBtn = screen.getByRole('button', { name: /Send Transfer/i });
    fireEvent.click(submitBtn);

    // Button should now be disabled and show in-flight spinner
    await waitFor(() => {
      const inFlightBtn = screen.getByRole('button', { name: /Executing Transfer \(In-Flight\)\.\.\./i });
      expect(inFlightBtn).toBeInTheDocument();
      expect(inFlightBtn).toBeDisabled();
    });

    // Resolve transfer
    resolveTransfer({ data: { transferId: 'tx-123' } });

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('enters safe retry mode with preserved key when server returns 500 error', async () => {
    transferApi.executeTransfer.mockRejectedValueOnce({
      response: {
        status: 500,
        data: { message: 'Database connection timeout' },
      },
    });

    renderModal();

    const recipientInput = screen.getByPlaceholderText(/e\.g\. b82898cf/i);
    fireEvent.change(recipientInput, { target: { value: 'wallet-9999-8888-7777' } });

    const submitBtn = screen.getByRole('button', { name: /Send Transfer/i });
    fireEvent.click(submitBtn);

    // Expect Safe Retry Mode notice and Retry button
    await waitFor(() => {
      expect(screen.getByText('Safe Retry Mode')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry Transfer \(Same Key\)/i })).toBeInTheDocument();
    });
  });
});
