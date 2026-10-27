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

    const response = await apiClient.post<any>(
      `/wallets/${walletId}/topup`,
      {
        amount: amountPaise,
        paymentMethod: 'UPI',
        paymentGatewayRef: paymentGatewayRef || `GATEWAY-${Date.now()}`,
      },
      { headers }
    );
    const data = response.data;
    return {
      transactionId: data.transactionId || data.id,
      walletId: data.walletId || walletId,
      amount: data.creditedAmount || data.amount || amountPaise,
      balanceAfter: data.newBalance ?? data.balanceAfter ?? amountPaise,
      reference: data.referenceId || data.reference || 'Wallet Top-Up',
      status: 'COMPLETED',
      createdAt: data.timestamp || data.createdAt || new Date().toISOString(),
    };
  },

  async getTransactions(
    walletId: string,
    params: TransactionQueryParams = {}
  ): Promise<PaginatedResponse<Transaction>> {
    const response = await apiClient.get<any>(
      `/wallets/${walletId}/transactions`,
      { params }
    );
    const data = response.data;
    if (data && Array.isArray(data.content)) {
      const mappedContent = data.content.map((tx: any) => {
        const isDebit = tx.fromWalletId === walletId;
        const resolvedType =
          tx.type === 'TOPUP' || tx.type === 'DEPOSIT'
            ? 'TOPUP'
            : isDebit
            ? 'TRANSFER_DEBIT'
            : 'TRANSFER_CREDIT';
        return {
          id: tx.id || tx.transactionId,
          walletId: isDebit ? tx.fromWalletId : (tx.toWalletId || walletId),
          relatedWalletId: isDebit ? tx.toWalletId : tx.fromWalletId,
          type:
            tx.type === 'TRANSFER_DEBIT' || tx.type === 'TRANSFER_CREDIT' || tx.type === 'TOPUP'
              ? tx.type
              : resolvedType,
          amount: tx.amount,
          balanceAfter: tx.balanceAfter ?? tx.amount,
          reference: tx.referenceId || tx.reference || tx.description || 'Transfer',
          status: tx.status || 'COMPLETED',
          createdAt: tx.createdAt,
        };
      });
      return {
        ...data,
        content: mappedContent,
      };
    }
    return data;
  },
};
