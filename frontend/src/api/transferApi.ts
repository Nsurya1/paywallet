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

    const response = await apiClient.post<TransferResponse>(
      '/transfers',
      {
        fromWalletId,
        toWalletId,
        amount: amountPaise,
        reference: reference || null,
      },
      { headers }
    );
    return response.data;
  },
};
