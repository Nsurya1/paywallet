import React, { useState, useEffect } from 'react';
import { walletApi } from '../api/walletApi';
import { transferApi } from '../api/transferApi';
import { useToast } from '../context/ToastContext';
import { rupeesToPaise, formatPaiseToRupees } from '../utils/currency';
import { generateIdempotencyKey } from '../utils/idempotency';
import {
  ArrowLeftRight,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  KeyRound,
  CheckCircle2,
  Loader2,
  Lock,
} from 'lucide-react';

export default function TransferPage() {
  const [wallet, setWallet] = useState(null);
  const [loadingWallet, setLoadingWallet] = useState(true);

  const [toWalletId, setToWalletId] = useState('');
  const [rupees, setRupees] = useState('250');
  const [reference, setReference] = useState('');

  // Idempotency state
  const [idempotencyKey, setIdempotencyKey] = useState(() => generateIdempotencyKey());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryableError, setRetryableError] = useState(null);
  const [conflictNotice, setConflictNotice] = useState(null);
  const [lastSuccess, setLastSuccess] = useState(null);

  const { addToast } = useToast();

  useEffect(() => {
    async function fetchWallet() {
      try {
        const wallets = await walletApi.getWallets();
        if (wallets && wallets.length > 0) {
          setWallet(wallets[0]);
        }
      } catch (err) {
        addToast('Failed to load wallet balance', 'error');
      } finally {
        setLoadingWallet(false);
      }
    }
    fetchWallet();
  }, [addToast]);

  const paise = rupeesToPaise(rupees);

  const handleInputChange = (setter) => (e) => {
    setter(e.target.value);
    setRetryableError(null);
    setConflictNotice(null);
    setLastSuccess(null);
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
      const response = await transferApi.executeTransfer(
        wallet.id,
        toWalletId.trim(),
        paise,
        reference.trim(),
        idempotencyKey
      );

      setLastSuccess({
        id: response.id,
        amount: paise,
        toWalletId: toWalletId.trim(),
        reference: reference.trim(),
        key: idempotencyKey,
      });

      // Refresh balance
      const updated = await walletApi.getWalletById(wallet.id);
      setWallet(updated);

      addToast(`Transfer of ₹${rupees} completed successfully!`, 'success');
      // Generate new key for next transaction
      setIdempotencyKey(generateIdempotencyKey());
    } catch (err) {
      const status = err.response?.status;
      const data = err.response?.data;
      const errorMsg = data?.message || err.message || 'Transfer failed.';

      if (status === 409) {
        setConflictNotice(
          '409 In-Flight Conflict: An identical transfer is currently being settled in PostgreSQL. Please wait a few seconds before retrying.'
        );
        addToast('Transaction in flight. Please wait.', 'warning');
      } else if (status === 422) {
        addToast('422 Error: Idempotency Key hash mismatch. Auto-generated a fresh key.', 'error');
        setIdempotencyKey(generateIdempotencyKey());
      } else if (!status || status >= 500) {
        // Safe retry condition
        setRetryableError(
          `Server or network glitch: "${errorMsg}". You can safely click "Retry Transfer" below: the exact same Idempotency Key (${idempotencyKey.substring(
            0,
            8
          )}...) will be used, preventing duplicate debits.`
        );
        addToast('Network glitch. Idempotent retry available.', 'error');
      } else {
        addToast(errorMsg, 'error');
        setIdempotencyKey(generateIdempotencyKey());
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
          <ArrowLeftRight className="w-7 h-7 text-brand-400" />
          <span>Peer-to-Peer Transfer Engine</span>
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Atomic multi-row settlement with dual-storage idempotency and deadlock-free locking
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Retryable Error Banner */}
          {retryableError && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-300 text-sm">Network / Server Disconnect</h4>
                  <p className="mt-1 text-amber-200/90 leading-relaxed">{retryableError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Conflict 409 Banner */}
          {conflictNotice && (
            <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-blue-300 text-sm">Request In-Flight</h4>
                <p className="mt-1 leading-relaxed">{conflictNotice}</p>
              </div>
            </div>
          )}

          {/* Success Banner */}
          {lastSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-emerald-300 text-sm">Transfer Settled</h4>
                <p className="mt-0.5 font-mono text-emerald-200/90">
                  Transaction ID: {lastSuccess.id}
                </p>
                <p className="text-xs text-emerald-300/80">
                  Transferred {formatPaiseToRupees(lastSuccess.amount)} with idempotency key.
                </p>
              </div>
            </div>
          )}

          {/* Transfer Form Box */}
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
            <form onSubmit={handleTransfer} className="space-y-5">
              {/* Sender Wallet Info */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Sender Wallet Account
                </label>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono text-slate-200 truncate max-w-[280px]">
                      {loadingWallet ? 'Loading...' : wallet?.id}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono-numbers">
                    {wallet ? formatPaiseToRupees(wallet.balance, wallet.currency) : '—'}
                  </span>
                </div>
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
                  placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  disabled={isSubmitting}
                  required
                />
              </div>

              {/* Amount */}
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
                    placeholder="250.00"
                    className="w-full pl-8 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono-numbers text-xl font-bold focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
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

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Transaction Reference / Memo
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={handleInputChange(setReference)}
                  placeholder="e.g. Office lunch, Client invoice #84"
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                  disabled={isSubmitting}
                />
              </div>

              {/* Idempotency Key Live Display */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium text-slate-300">
                    <KeyRound className="w-3.5 h-3.5 text-brand-400" />
                    <span>Active Idempotency-Key:</span>
                  </span>
                  <span className="font-mono text-indigo-300 text-[11px] truncate max-w-[220px]">
                    {idempotencyKey}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Key is preserved on network retry to prevent accidental double-charge.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || paise <= 0}
                className={`w-full mt-2 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl text-white font-bold text-sm shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                  retryableError
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                    : 'bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 shadow-indigo-600/30'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing ACID Transfer (In Flight)...</span>
                  </>
                ) : retryableError ? (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Retry Transfer (Same Key)</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Confirm Transfer (₹{rupees || 0})</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Info & Architectural Guarantees Column */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Financial Guarantees
            </h3>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="font-bold text-brand-300 block mb-1">
                  1. Double-Entry Bookkeeping
                </span>
                Every transfer inserts 1 transactions row and 2 balanced ledger entries (1 debit, 1 credit).
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="font-bold text-brand-300 block mb-1">
                  2. Anti-Deadlock Ordering
                </span>
                Pessimistic write locks are acquired in consistent sorted wallet ID order ($W_A &lt; W_B$), mathematically preventing $A \to B$ deadlocks.
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="font-bold text-brand-300 block mb-1">
                  3. Dual-Storage Idempotency
                </span>
                Atomic Redis cache + PostgreSQL ground truth prevents duplicate debits on connection drops or double-clicks.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
