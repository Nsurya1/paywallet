import apiClient from './client';
import { Wallet, Transaction, PaginatedResponse, TopUpResponse } from '@/types';

export interface TransactionQueryParams {
  page?: number;
  size?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  sort?: string;
}

export const walletApi = {
  async getWallets(): Promise<Wallet[]> {
    const response = await apiClient.get<Wallet[]>('/wallets');
    return response.data;
  },

  async createWallet(currency: string = 'INR'): Promise<Wallet> {
    const response = await apiClient.post<Wallet>('/wallets', { currency });
    return response.data;
  },

  async getWalletById(id: string): Promise<Wallet> {
    const response = await apiClient.get<Wallet>(`/wallets/${id}`);
    return response.data;
  },

  async topUpWallet(
    walletId: string,
    amountPaise: number,
    paymentGatewayRef?: string,
    idempotencyKey?: string
  ): Promise<TopUpResponse> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const response = await apiClient.post<TopUpResponse>(
      `/wallets/${walletId}/topup`,
      {
        amount: amountPaise,
        paymentGatewayRef: paymentGatewayRef || `GATEWAY-${Date.now()}`,
      },
      { headers }
    );
    return response.data;
  },

  async getTransactions(
    walletId: string,
    params: TransactionQueryParams = {}
  ): Promise<PaginatedResponse<Transaction>> {
    const response = await apiClient.get<PaginatedResponse<Transaction>>(
      `/wallets/${walletId}/transactions`,
      { params }
    );
    return response.data;
  },
};
