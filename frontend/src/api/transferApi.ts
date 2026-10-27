import apiClient from './client';
import { TransferResponse } from '@/types';

export const transferApi = {
  async executeTransfer(
    fromWalletId: string,
    toWalletId: string,
    amountPaise: number,
    reference?: string,
    idempotencyKey?: string
  ): Promise<TransferResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<any>(
      '/transfers',
      {
        fromWalletId,
        toWalletId,
        amount: amountPaise,
        description: reference || null,
        reference: reference || null,
      },
      { headers }
    );
    const data = response.data;
    return {
      transferId: data.transactionId || data.transferId || data.id,
      fromWalletId: data.fromWalletId,
      toWalletId: data.toWalletId,
      amount: data.amount,
      currency: data.currency || 'INR',
      reference: data.reference || data.referenceId || data.description || 'Transfer',
      status: data.status || 'COMPLETED',
      createdAt: data.createdAt || new Date().toISOString(),
    };
  },
};
