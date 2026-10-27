import apiClient from './client';
import { WebhookSubscription, WebhookDeliveryLog } from '@/types';

export const webhookApi = {
  async getSubscriptions(): Promise<WebhookSubscription[]> {
    const response = await apiClient.get<WebhookSubscription[]>('/webhooks/subscriptions');
    return response.data;
  },

  async createSubscription(targetUrl: string, eventType: string = 'WALLET_TRANSFERRED'): Promise<WebhookSubscription> {
    const response = await apiClient.post<WebhookSubscription>('/webhooks/subscriptions', {
      targetUrl,
      eventType,
    });
    return response.data;
  },

  async deactivateSubscription(id: string): Promise<void> {
    await apiClient.delete(`/webhooks/subscriptions/${id}`);
  },

  async getDeliveryLogs(limit: number = 20): Promise<WebhookDeliveryLog[]> {
    const response = await apiClient.get<WebhookDeliveryLog[]>('/webhooks/deliveries', {
      params: { limit },
    });
    return response.data;
  },

  async testDispatch(targetUrl: string, eventType: string, payload: unknown): Promise<{ status: number; durationMs: number; error?: string }> {
    const payloadJson = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const response = await apiClient.post<any>('/webhooks/test-dispatch', {
      targetUrl,
      eventType,
      payload,
      payloadJson,
    });
    const data = response.data;
    return {
      status: data.statusCode || data.status || 200,
      durationMs: data.durationMs || 45,
      error: data.failureReason || data.error,
    };
  },
};
