import React, { useState, useEffect } from 'react';
import { transferApi } from '../api/transferApi';
import { useToast } from '../context/ToastContext';
import { rupeesToPaise, formatPaiseToRupees } from '../utils/currency';
import { generateIdempotencyKey } from '../utils/idempotency';
import { X, ArrowRight, Loader2, RotateCcw, AlertTriangle, ShieldCheck, KeyRound } from 'lucide-react';

export default function TransferModal({ isOpen, onClose, wallet, onSuccess }) {
  const [toWalletId, setToWalletId] = useState('');
  const [rupees, setRupees] = useState('100');
  const [reference, setReference] = useState('');
  
  // Idempotency state management
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryableError, setRetryableError] = useState(null);
  const [conflictNotice, setConflictNotice] = useState(null);

  const { addToast } = useToast();

  // Generate fresh key when modal opens or input changes
  useEffect(() => {
    if (isOpen) {
      setIdempotencyKey(generateIdempotencyKey());
      setRetryableError(null);
      setConflictNotice(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const paise = rupeesToPaise(rupees);

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    // If user changes inputs, clear retry state and generate fresh key
    setRetryableError(null);
    setConflictNotice(null);
    setIdempotencyKey(generateIdempotencyKey());
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!wallet) return;

    if (!toWalletId.trim()) {
      addToast('Recipient Wallet ID is required', 'warning');
      return;
    }

    if (toWalletId.trim() === wallet.id) {
      addToast('Cannot transfer to the same wallet account', 'warning');
      return;
    }

    if (paise <= 0) {
      addToast('Transfer amount must be greater than ₹0.00', 'warning');
      return;
    }

    if (paise > wallet.balance) {
      addToast(
        `Insufficient funds. Current balance: ${formatPaiseToRupees(wallet.balance, wallet.currency)}`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    setRetryableError(null);
    setConflictNotice(null);

    try {
      await transferApi.executeTransfer(
        wallet.id,
        toWalletId.trim(),
        paise,
        reference.trim(),
        idempotencyKey
      );

      addToast(`Transfer of ₹${rupees} succeeded!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      const errorMsg = data?.message || err.message || 'Transfer failed.';

      if (status === 409) {
        // In-flight request or key lock
        setConflictNotice(
          '409 Conflict: A transaction with this Idempotency-Key is currently in-flight or processing. Please wait 5 seconds before retrying.'
        );
        addToast('Request already in-flight. Please wait.', 'warning');
      } else if (status === 422) {
        // Request hash mismatch
        addToast('422 Error: Request body changed for existing idempotency key. Generated a fresh key.', 'error');
        setIdempotencyKey(generateIdempotencyKey());
      } else if (!status || status >= 500) {
        // Network timeout / 5xx server error: REUSE KEY ON RETRY!
        setRetryableError(
          `Server or network glitch: "${errorMsg}". You can safely click "Retry Transfer" below to resubmit with the exact same Idempotency-Key without double-debiting.`
        );
        addToast('Network or server error. Safe retry enabled.', 'error');
      } else {
        // 400 Bad Request, Insufficient Funds, etc.
        addToast(errorMsg, 'error');
        setIdempotencyKey(generateIdempotencyKey());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Concurrency-Safe Transfer</h3>
              <p className="text-xs text-slate-400">Double-entry ledger with idempotency guard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Retryable Error Notice */}
        {retryableError && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-300">Safe Retry Mode</p>
                <p className="mt-0.5 text-amber-200/90 leading-relaxed">{retryableError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Conflict Notice */}
        {conflictNotice && (
          <div className="mt-4 p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed">{conflictNotice}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleTransfer} className="mt-5 space-y-4">
          {/* Sender Account */}
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">From Wallet:</span>
            <span className="text-xs font-mono text-slate-200 font-semibold truncate max-w-[260px]">
              {wallet.id}
            </span>
          </div>

          {/* Recipient Wallet UUID */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Recipient Wallet ID (UUID)
            </label>
            <input
              type="text"
              value={toWalletId}
              onChange={handleInputChange(setToWalletId)}
              placeholder="e.g. b82898cf-3fa2-4318-80f2-53bbfd9b4db9"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              disabled={isSubmitting}
              required
            />
          </div>

          {/* Amount in Rupees */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Transfer Amount (in ₹ Rupees)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-bold text-lg">
                ₹
              </span>
              <input
                type="number"
                min="0.01"
                step="any"
                value={rupees}
                onChange={handleInputChange(setRupees)}
                placeholder="100.00"
                className="w-full pl-8 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono-numbers text-lg font-bold focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
              <span>Minor Units:</span>
              <span className="font-mono text-indigo-400 font-semibold">
                {paise.toLocaleString()} paise
              </span>
            </div>
          </div>

          {/* Reference / Memo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Reference / Note
            </label>
            <input
              type="text"
              value={reference}
              onChange={handleInputChange(setReference)}
              placeholder="Dinner bill, Rent, Invoice #102..."
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              disabled={isSubmitting}
            />
          </div>

          {/* Idempotency Key Live Preview */}
          <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-brand-400" />
              <span>Idempotency-Key:</span>
            </span>
            <span className="font-mono text-slate-300 truncate max-w-[240px]">
              {idempotencyKey}
            </span>
          </div>

          {/* Submit / Retry Button */}
          <button
            type="submit"
            disabled={isSubmitting || paise <= 0}
            className={`w-full mt-2 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
              retryableError
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-indigo-600/30'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executing Transfer (In-Flight)...</span>
              </>
            ) : retryableError ? (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Retry Transfer (Same Key)</span>
              </>
            ) : (
              <>
                <span>Send Transfer (₹{rupees || 0})</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
