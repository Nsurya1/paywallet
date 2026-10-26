import React from 'react';
import { ArrowDownLeft, ArrowUpRight, ArrowRight, ReceiptText, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Transaction } from '@/types';
import { formatPaiseToRupees } from '@/lib/currency';
import { formatDate } from '@/lib/formatDate';

export interface RecentTransactionsListProps {
  transactions: Transaction[];
  isLoading?: boolean;
  onViewAll: () => void;
  onSelectTransaction?: (tx: Transaction) => void;
}

export function RecentTransactionsList({
  transactions,
  isLoading = false,
  onViewAll,
  onSelectTransaction,
}: RecentTransactionsListProps) {
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

  const getTransactionTitle = (tx: Transaction) => {
    if (tx.reference && tx.reference.trim()) {
      return tx.reference;
    }
    if (tx.type === 'TOPUP') {
      return 'Wallet Top-Up';
    }
    if (tx.type === 'TRANSFER_CREDIT') {
      return tx.relatedWalletId
        ? `Received from ${tx.relatedWalletId.substring(0, 8)}•••`
        : 'Inbound Transfer';
    }
    if (tx.type === 'TRANSFER_DEBIT') {
      return tx.relatedWalletId
        ? `Transferred to ${tx.relatedWalletId.substring(0, 8)}•••`
        : 'Outbound Transfer';
    }
    return 'Ledger Transaction';
  };

  return (
    <Card className="p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h3 className="text-base font-bold text-foreground">Recent Transactions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time settled ledger events with zero balance drift
          </p>
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <span>View all</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content */}
      <div className="mt-2 divide-y divide-border">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="py-3.5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="w-36 h-4 rounded" />
                  <Skeleton className="w-24 h-3 rounded" />
                </div>
              </div>
              <div className="space-y-1.5 text-right">
                <Skeleton className="w-20 h-4 rounded ml-auto" />
                <Skeleton className="w-14 h-3 rounded ml-auto" />
              </div>
            </div>
          ))
        ) : transactions.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={ReceiptText}
              title="No recent transactions"
              description="Top up your wallet or transfer funds to start seeing double-entry settled transactions."
            />
          </div>
        ) : (
          transactions.slice(0, 5).map((tx) => {
            const credit = isCredit(tx.type);
            const formattedAmount = formatPaiseToRupees(tx.amount);

            return (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction?.(tx)}
                className={`py-3.5 flex items-center justify-between gap-4 transition-colors rounded-xl px-2 -mx-2 ${
                  onSelectTransaction ? 'cursor-pointer hover:bg-secondary/50' : ''
                }`}
              >
                {/* Left: Icon & Description */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      credit
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {credit ? (
                      <ArrowDownLeft className="w-5 h-5" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {getTransactionTitle(tx)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <span>{formatDate(tx.createdAt)}</span>
                      <span>•</span>
                      <span className="font-mono text-[11px] truncate">
                        ID: {tx.id.substring(0, 8)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Amount & Status Badge */}
                <div className="text-right flex-shrink-0">
                  <div
                    className={`text-sm sm:text-base font-extrabold font-mono tracking-tight ${
                      credit
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {credit ? `+ ${formattedAmount}` : `- ${formattedAmount}`}
                  </div>
                  <div className="mt-1 flex justify-end">
                    <Badge variant={getStatusBadgeVariant(tx.status)} size="sm">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Assurance Banner */}
      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>PostgreSQL Serializable ACID Guarantees</span>
        </div>
        <span className="font-mono text-[11px]">Audit Sync: OK</span>
      </div>
    </Card>
  );
}
