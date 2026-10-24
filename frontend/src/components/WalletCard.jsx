import React, { useState } from 'react';
import { formatPaiseToRupees } from '../utils/currency';
import { Copy, Check, ArrowUpRight, PlusCircle, ShieldCheck } from 'lucide-react';

export default function WalletCard({ wallet, onOpenTopUp, onOpenTransfer }) {
  const [copied, setCopied] = useState(false);

  if (!wallet) {
    return (
      <div className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 text-center animate-pulse">
        <div className="h-6 w-32 bg-slate-800 rounded mx-auto mb-4"></div>
        <div className="h-10 w-48 bg-slate-800 rounded mx-auto mb-6"></div>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(wallet.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-6 sm:p-8 border border-indigo-500/20 shadow-2xl shadow-indigo-950/50">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-brand-500/10 blur-3xl pointer-events-none"></div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Primary Currency Account
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              {wallet.currency || 'INR'}
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
              wallet.status === 'ACTIVE'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {wallet.status}
            </span>
          </div>

          {/* Formatted Balance */}
          <div className="flex items-baseline gap-2">
            <div className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight font-mono-numbers">
              {formatPaiseToRupees(wallet.balance, wallet.currency)}
            </div>
            <span className="text-xs text-slate-400 font-mono-numbers">
              ({wallet.balance?.toLocaleString()} minor units)
            </span>
          </div>

          {/* Wallet ID with Copy */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">
              ID: {wallet.id}
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title="Copy Wallet ID"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenTopUp}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-white font-semibold text-sm border border-slate-700 shadow-md transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-emerald-400" />
            <span>Top Up</span>
          </button>

          <button
            onClick={onOpenTransfer}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4 text-white" />
            <span>Send Money</span>
          </button>
        </div>
      </div>
    </div>
  );
}
