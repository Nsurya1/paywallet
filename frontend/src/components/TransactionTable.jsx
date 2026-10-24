import React from 'react';
import { formatPaiseToRupees } from '../utils/currency';
import { formatTimestamp } from '../utils/formatDate';
import { ArrowDownLeft, ArrowUpRight, Plus, Filter, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

export default function TransactionTable({
  transactions,
  totalElements,
  totalPages,
  currentPage,
  pageSize,
  filterType,
  onFilterTypeChange,
  onPageChange,
  onRefresh,
  loading,
}) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
      {/* Header & Filter Bar */}
      <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <span>Transaction Ledger History</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
              {totalElements} entries
            </span>
          </h4>
          <p className="text-xs text-slate-400">Immutable double-entry ledger journal</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          {/* Type Filter */}
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => onFilterTypeChange(e.target.value)}
              className="pl-8 pr-8 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 font-medium focus:outline-none focus:border-brand-500 appearance-none cursor-pointer"
            >
              <option value="">All Transactions</option>
              <option value="TOPUP">Top-ups Only</option>
              <option value="TRANSFER_DEBIT">Debits (Sent)</option>
              <option value="TRANSFER_CREDIT">Credits (Received)</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            title="Refresh transactions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-5">Type / Direction</th>
              <th className="py-3 px-5">Reference & Details</th>
              <th className="py-3 px-5">Date & Time</th>
              <th className="py-3 px-5 text-right">Amount</th>
              <th className="py-3 px-5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50 text-sm">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-12 text-center text-slate-500 text-sm">
                  {loading ? 'Loading transactions...' : 'No transactions recorded yet.'}
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isDebit = tx.type === 'TRANSFER_DEBIT';
                const isCredit = tx.type === 'TRANSFER_CREDIT';
                const isTopup = tx.type === 'TOPUP';

                return (
                  <tr key={tx.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Type & Icon */}
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isDebit
                              ? 'bg-rose-500/10 text-rose-400'
                              : isCredit
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-blue-500/10 text-blue-400'
                          }`}
                        >
                          {isDebit && <ArrowUpRight className="w-4 h-4" />}
                          {isCredit && <ArrowDownLeft className="w-4 h-4" />}
                          {isTopup && <Plus className="w-4 h-4" />}
                        </div>
                        <div>
                          <span className="font-semibold text-xs text-slate-200 block">
                            {isTopup ? 'Balance Top-Up' : isDebit ? 'Transfer Sent' : 'Transfer Received'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {tx.type}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Reference / Note */}
                    <td className="py-4 px-5">
                      <span className="text-xs text-slate-300 block">
                        {tx.reference || '—'}
                      </span>
                      {tx.relatedWalletId && (
                        <span className="text-[10px] text-slate-400 font-mono truncate max-w-[160px] block">
                          Counterparty: {tx.relatedWalletId}
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="py-4 px-5 text-xs text-slate-400 font-mono">
                      {formatTimestamp(tx.createdAt)}
                    </td>

                    {/* Amount */}
                    <td className="py-4 px-5 text-right font-mono-numbers">
                      <span
                        className={`font-bold text-sm ${
                          isDebit ? 'text-rose-400' : 'text-emerald-400'
                        }`}
                      >
                        {isDebit ? '-' : '+'}
                        {formatPaiseToRupees(tx.amount)}
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        {tx.amount?.toLocaleString()} paise
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-5 text-right">
                      <span className="inline-block text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {tx.status || 'COMPLETED'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <span className="text-white font-semibold">{currentPage + 1}</span> of{' '}
            <span className="text-white font-semibold">{totalPages}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0 || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1 || loading}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
