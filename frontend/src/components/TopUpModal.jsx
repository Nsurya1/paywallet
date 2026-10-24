import React, { useState } from 'react';
import { walletApi } from '../api/walletApi';
import { useToast } from '../context/ToastContext';
import { rupeesToPaise } from '../utils/currency';
import { generateIdempotencyKey } from '../utils/idempotency';
import { X, CreditCard, Loader2, Sparkles } from 'lucide-react';

export default function TopUpModal({ isOpen, onClose, wallet, onSuccess }) {
  const [rupees, setRupees] = useState('500');
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { addToast } = useToast();

  if (!isOpen) return null;

  const paise = rupeesToPaise(rupees);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!wallet) return;

    if (paise <= 0) {
      addToast('Please enter an amount greater than ₹0.00', 'warning');
      return;
    }

    setIsSubmitting(true);
    const idempotencyKey = generateIdempotencyKey();

    try {
      await walletApi.topUpWallet(wallet.id, paise, paymentMethod, idempotencyKey);
      addToast(`Successfully topped up ₹${rupees}!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Top-up failed. Please try again.';
      addToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAmounts = ['100', '500', '1000', '2500', '5000'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Top Up Wallet</h3>
              <p className="text-xs text-slate-400">Add funds via mock payment gateway</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Amount in Rupees */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Amount (in ₹ Rupees)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 font-bold text-lg">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="any"
                value={rupees}
                onChange={(e) => setRupees(e.target.value)}
                placeholder="500.00"
                className="w-full pl-8 pr-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono-numbers text-xl font-bold focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
              <span>Minor Units:</span>
              <span className="font-mono text-emerald-400 font-semibold">
                {paise.toLocaleString()} paise
              </span>
            </div>
          </div>

          {/* Quick Amount Pills */}
          <div className="flex flex-wrap gap-2">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setRupees(amt)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  rupees === amt
                    ? 'bg-brand-600 text-white border-brand-500'
                    : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                }`}
              >
                ₹{amt}
              </button>
            ))}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Payment Gateway Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'CARD', label: 'Card' },
                { id: 'UPI', label: 'UPI' },
                { id: 'NET_BANKING', label: 'NetBanking' },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPaymentMethod(id)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all ${
                    paymentMethod === id
                      ? 'bg-brand-600/20 text-brand-300 border-brand-500/50 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || paise <= 0}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Processing Top-Up...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Confirm Top-Up (₹{rupees || 0})</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
