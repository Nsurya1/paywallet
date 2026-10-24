import api from './client';

export const walletApi = {
  getWallets: async () => {
    const response = await api.get('/wallets');
    return response.data;
  },

  createWallet: async (currency = 'INR') => {
    const response = await api.post('/wallets', { currency });
    return response.data;
  },

  getWalletById: async (walletId) => {
    const response = await api.get(`/wallets/${walletId}`);
    return response.data;
  },

  topUpWallet: async (walletId, amount, paymentMethod = 'CARD', idempotencyKey) => {
    const response = await api.post(
      `/wallets/${walletId}/topup`,
      { amount, paymentMethod },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return response.data;
  },

  getTransactions: async (walletId, params = {}) => {
    const response = await api.get(`/wallets/${walletId}/transactions`, { params });
    return response.data;
  },
};
