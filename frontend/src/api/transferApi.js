import api from './client';

export const transferApi = {
  executeTransfer: async (fromWalletId, toWalletId, amount, reference, idempotencyKey) => {
    const response = await api.post(
      '/transfers',
      {
        fromWalletId,
        toWalletId,
        amount,
        reference: reference || 'Peer-to-Peer Transfer',
      },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return response.data;
  },
};
