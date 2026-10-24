import api from './client';

export const webhookApi = {
  getSubscriptions: async () => {
    const response = await api.get('/webhooks/subscriptions');
    return response.data;
  },

  createSubscription: async (targetUrl, eventType = '*', secretKey = '') => {
    const response = await api.post('/webhooks/subscriptions', {
      targetUrl,
      eventType,
      secretKey,
    });
    return response.data;
  },

  deactivateSubscription: async (id) => {
    const response = await api.delete(`/webhooks/subscriptions/${id}`);
    return response.data;
  },

  getDeliveryLogs: async (limit = 20) => {
    const response = await api.get(`/webhooks/deliveries?limit=${limit}`);
    return response.data;
  },

  testDispatch: async (targetUrl, eventType = 'TEST_EVENT', payloadJson = '') => {
    const response = await api.post('/webhooks/test-dispatch', {
      targetUrl,
      eventType,
      payloadJson,
    });
    return response.data;
  },
};
