import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { Transaction } from '@/types';
import { formatPaiseToRupees } from '@/lib/currency';
import { formatDate } from '@/lib/formatDate';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export type SortField = 'createdAt' | 'amount' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectTransaction: (tx: Transaction) => void;
  onResetFilters?: () => void;
}

export function TransactionTable({
  transactions,
  isLoading,
  totalElements,
  totalPages,
  currentPage,
  pageSize,
  sortField,
  sortOrder,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onSelectTransaction,
  onResetFilters,
}: TransactionTableProps) {
  const isCredit = (type: string) => type === 'TRANSFER_CREDIT' || type === 'TOPUP';

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'FAILED':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const getTitle = (tx: Transaction) => {
    if (tx.reference && tx.reference.trim()) return tx.reference;
    if (tx.type === 'TOPUP') return 'Wallet Top-Up';
    if (tx.type === 'TRANSFER_CREDIT') {
      return tx.relatedWalletId
        ? `Received from ${tx.relatedWalletId.substring(0, 8)}•••`
        : 'Received Funds';
    }
    if (tx.type === 'TRANSFER_DEBIT') {
      return tx.relatedWalletId
        ? `Sent to ${tx.relatedWalletId.substring(0, 8)}•••`
        : 'Transferred Funds';
    }
    return 'Ledger Transaction';
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-muted-foreground/60" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 ml-1 text-primary font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 ml-1 text-primary font-bold" />
    );
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-card">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border bg-secondary/50 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider select-none">
              <th
                onClick={() => onSortChange('type')}
                className="py-3.5 px-5 cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center">
                  <span>Type / Direction</span>
                  {renderSortIcon('type')}
                </div>
              </th>

              <th className="py-3.5 px-5">Reference & Details</th>

              <th
                onClick={() => onSortChange('createdAt')}
                className="py-3.5 px-5 cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center">
                  <span>Date & Timestamp</span>
                  {renderSortIcon('createdAt')}
                </div>
              </th>

              <th
                onClick={() => onSortChange('amount')}
                className="py-3.5 px-5 text-right cursor-pointer hover:text-foreground transition-colors"
              >
                <div className="flex items-center justify-end">
                  <span>Amount (INR)</span>
                  {renderSortIcon('amount')}
                </div>
              </th>

              <th className="py-3.5 px-5 text-right">Status</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-border">
            {isLoading ? (
              // Loading Skeleton Rows
              Array.from({ length: pageSize > 5 ? 5 : pageSize }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2.5">
                      <Skeleton className="w-8 h-8 rounded-xl" />
                      <Skeleton className="w-24 h-4 rounded" />
                    </div>
                  </td>
                  <td className="py-4 px-5">
                    <Skeleton className="w-36 h-4 rounded mb-1" />
                    <Skeleton className="w-20 h-3 rounded" />
                  </td>
                  <td className="py-4 px-5">
                    <Skeleton className="w-28 h-4 rounded" />
                  </td>
                  <td className="py-4 px-5 text-right">
                    <Skeleton className="w-20 h-4 rounded ml-auto" />
                  </td>
                  <td className="py-4 px-5 text-right">
                    <Skeleton className="w-16 h-5 rounded-full ml-auto" />
                  </td>
                </tr>
              ))
            ) : transactions.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={5} className="py-12 px-4 text-center">
                  <EmptyState
                    icon={Receipt}
                    title="No matching transactions found"
                    description="Try adjusting your search criteria, dates, or filters to find what you are looking for."
                    actionLabel={onResetFilters ? 'Clear Filters' : undefined}
                    onAction={onResetFilters}
                  />
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const credit = isCredit(tx.type);
                const formattedAmount = formatPaiseToRupees(tx.amount);

                return (
                  <tr
                    key={tx.id}
                    onClick={() => onSelectTransaction(tx)}
                    className="hover:bg-secondary/40 transition-colors cursor-pointer group"
                  >
                    {/* Direction Icon & Type */}
                    <td className="py-3.5 px-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 ${
                            credit
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {credit ? (
                            <ArrowDownLeft className="w-4 h-4" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4" />
                          )}
                        </div>
                        <span className="font-semibold text-foreground">
                          {tx.type === 'TOPUP'
                            ? 'Top-Up'
                            : credit
                            ? 'Credit'
                            : 'Debit'}
                        </span>
                      </div>
                    </td>

                    {/* Reference / Narrative */}
                    <td className="py-3.5 px-5">
                      <div className="font-semibold text-foreground truncate max-w-xs">
                        {getTitle(tx)}
                      </div>
                      <div className="font-mono text-[11px] text-muted-foreground truncate max-w-xs mt-0.5">
                        ID: {tx.id}
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-5 text-muted-foreground whitespace-nowrap">
                      {formatDate(tx.createdAt)}
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <span
                        className={`font-mono font-bold text-sm ${
                          credit
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {credit ? `+ ${formattedAmount}` : `- ${formattedAmount}`}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-5 text-right whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(tx.status)} size="sm">
                        {tx.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-muted-foreground">
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="bg-secondary/50 border border-border rounded-lg px-2 py-1 text-foreground font-semibold focus:outline-none cursor-pointer"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
          <span className="ml-2 font-mono">
            {totalElements} total records
          </span>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-3">
          <span className="font-medium">
            Page <span className="font-bold text-foreground">{currentPage + 1}</span> of{' '}
            <span className="font-bold text-foreground">{totalPages || 1}</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 0 || isLoading}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage + 1 >= totalPages || isLoading}
              className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
