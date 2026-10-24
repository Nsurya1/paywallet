import React, { useState, useEffect, useCallback } from 'react';
import { webhookApi } from '../api/webhookApi';
import { useToast } from '../context/ToastContext';
import { formatTimestamp } from '../utils/formatDate';
import {
  Bell,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Zap,
  Loader2,
  KeyRound,
} from 'lucide-react';

export default function NotificationsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Subscription Form
  const [targetUrl, setTargetUrl] = useState('');
  const [eventType, setEventType] = useState('WALLET_TRANSFERRED');
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Test Dispatch Form
  const [testUrl, setTestUrl] = useState('');
  const [testEventType, setTestEventType] = useState('WALLET_TRANSFERRED');
  const [testPayload, setTestPayload] = useState('{"amount":5000,"currency":"INR"}');
  const [isDispatching, setIsDispatching] = useState(false);
  const [lastTestResult, setLastTestResult] = useState(null);

  const { addToast } = useToast();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subs, logs] = await Promise.all([
        webhookApi.getSubscriptions(),
        webhookApi.getDeliveryLogs(15),
      ]);
      setSubscriptions(subs || []);
      setDeliveryLogs(logs || []);
    } catch (err) {
      addToast('Failed to load webhook data', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateSubscription = async (e) => {
    e.preventDefault();
    if (!targetUrl.trim()) {
      addToast('Target URL is required', 'warning');
      return;
    }

    setIsSubscribing(true);
    try {
      await webhookApi.createSubscription(targetUrl.trim(), eventType);
      addToast('Webhook subscription registered successfully!', 'success');
      setTargetUrl('');
      loadData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create subscription', 'error');
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await webhookApi.deactivateSubscription(id);
      addToast('Webhook subscription deactivated', 'info');
      loadData();
    } catch (err) {
      addToast('Failed to deactivate subscription', 'error');
    }
  };

  const handleTestDispatch = async (e) => {
    e.preventDefault();
    if (!testUrl.trim()) {
      addToast('Test Target URL is required', 'warning');
      return;
    }

    setIsDispatching(true);
    setLastTestResult(null);

    try {
      const res = await webhookApi.testDispatch(testUrl.trim(), testEventType, testPayload);
      setLastTestResult(res);
      if (res.status === 'SUCCESS') {
        addToast(`Webhook delivered with status ${res.responseStatusCode}`, 'success');
      } else if (res.status === 'CIRCUIT_OPEN') {
        addToast('Resilience4j Circuit Breaker is OPEN for this target.', 'warning');
      } else {
        addToast(`Dispatch completed with status: ${res.status}`, 'error');
      }
      loadData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Dispatch failed', 'error');
    } finally {
      setIsDispatching(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <Bell className="w-7 h-7 text-indigo-400" />
            <span>Webhooks & Event Stream</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Resilience4j protected outbound notifications with HMAC-SHA256 signatures
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Register Webhook Form */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-brand-400" />
            <span>Register Webhook Endpoint</span>
          </h3>
          <p className="text-xs text-slate-400">
            External partner URL that will receive domain event POST payloads signed with HMAC-SHA256.
          </p>

          <form onSubmit={handleCreateSubscription} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Webhook URL
              </label>
              <input
                type="url"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://webhook.site/your-id or https://partner.com/webhook"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-brand-500"
                disabled={isSubscribing}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Event Subscription Filter
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-medium focus:outline-none focus:border-brand-500 cursor-pointer"
              >
                <option value="WALLET_TRANSFERRED">WALLET_TRANSFERRED (Transfers)</option>
                <option value="WALLET_TOPPED_UP">WALLET_TOPPED_UP (Top-Ups)</option>
                <option value="*">* (All Domain Events)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isSubscribing || !targetUrl.trim()}
              className="w-full py-3 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubscribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Register Subscription</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Test Dispatcher */}
        <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Test Dispatcher (Resilience4j)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Manually trigger an outbound dispatch to test Circuit Breakers, Retries, and HMAC signing.
          </p>

          <form onSubmit={handleTestDispatch} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Endpoint URL
              </label>
              <input
                type="url"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="https://webhook.site/... or http://localhost:8080/test/mock-webhook/success"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-mono focus:outline-none focus:border-brand-500"
                disabled={isDispatching}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                JSON Payload
              </label>
              <textarea
                rows="2"
                value={testPayload}
                onChange={(e) => setTestPayload(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-indigo-300 text-xs font-mono focus:outline-none focus:border-brand-500"
                disabled={isDispatching}
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isDispatching || !testUrl.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isDispatching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Dispatch Webhook</span>
                </>
              )}
            </button>
          </form>

          {/* Test Result Callout */}
          {lastTestResult && (
            <div className={`p-3.5 rounded-xl border text-xs font-mono ${
              lastTestResult.status === 'SUCCESS'
                ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                : lastTestResult.status === 'CIRCUIT_OPEN'
                ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                : 'bg-rose-950/40 border-rose-800 text-rose-300'
            }`}>
              <div className="font-bold mb-1 flex items-center gap-2">
                <span>Status: {lastTestResult.status}</span>
                {lastTestResult.responseStatusCode && (
                  <span>(HTTP {lastTestResult.responseStatusCode})</span>
                )}
                <span>- {lastTestResult.durationMs}ms</span>
              </div>
              {lastTestResult.errorMessage && (
                <p className="text-[11px] opacity-80 mt-1">{lastTestResult.errorMessage}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Subscriptions List */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <h3 className="text-base font-bold text-white">Your Webhook Subscriptions</h3>
        {subscriptions.length === 0 ? (
          <p className="text-xs text-slate-500 py-4">No webhook endpoints registered yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-200 font-semibold truncate max-w-sm">
                      {sub.targetUrl}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-brand-300 border border-slate-700">
                      {sub.eventType}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      sub.active
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-slate-800 text-slate-500'
                    }`}>
                      {sub.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                    <KeyRound className="w-3 h-3 text-slate-500" />
                    <span>Secret: {sub.secretKey ? sub.secretKey.substring(0, 10) + '...' : '—'}</span>
                  </div>
                </div>

                {sub.active && (
                  <button
                    onClick={() => handleDeactivate(sub.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors self-start sm:self-auto"
                    title="Deactivate"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery Logs */}
      <div className="rounded-3xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-5 border-b border-slate-800">
          <h3 className="text-base font-bold text-white">Outbound Webhook Delivery Logs</h3>
          <p className="text-xs text-slate-400">Audit trail of outbound HTTP notifications with response status codes</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-5">Event Type</th>
                <th className="py-3 px-5">Target URL</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5">HTTP Code</th>
                <th className="py-3 px-5">Latency</th>
                <th className="py-3 px-5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {deliveryLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-500">
                    No webhook deliveries logged yet.
                  </td>
                </tr>
              ) : (
                deliveryLogs.map((log) => {
                  let badge = 'bg-slate-800 text-slate-300';
                  if (log.status === 'SUCCESS') badge = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                  else if (log.status === 'CIRCUIT_OPEN') badge = 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
                  else if (log.status === 'RETRY_EXHAUSTED' || log.status === 'FAILED') badge = 'bg-rose-500/10 text-rose-400 border border-rose-500/20';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-5 font-semibold text-slate-200">
                        {log.eventType}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-slate-300 truncate max-w-xs">
                        {log.targetUrl}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${badge}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-slate-300">
                        {log.responseStatusCode || '—'}
                      </td>
                      <td className="py-3.5 px-5 font-mono text-slate-400">
                        {log.durationMs} ms
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-slate-400">
                        {formatTimestamp(log.deliveredAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
