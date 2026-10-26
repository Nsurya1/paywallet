import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Wallet,
  Receipt,
  FileText,
  Clock,
} from 'lucide-react';
import { Transaction } from '@/types';
import { formatPaiseToRupees } from '@/lib/currency';
import { formatDate } from '@/lib/formatDate';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export interface TransactionDrawerProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TransactionDrawer({ transaction, isOpen, onClose }: TransactionDrawerProps) {
  const [copiedId, setCopiedId] = React.useState(false);
  const [copiedRelated, setCopiedRelated] = React.useState(false);

  if (!transaction) return null;

  const isCredit = transaction.type === 'TRANSFER_CREDIT' || transaction.type === 'TOPUP';
  const formattedAmount = formatPaiseToRupees(transaction.amount);
  const formattedBalanceAfter = formatPaiseToRupees(transaction.balanceAfter);

  const handleCopyId = () => {
    navigator.clipboard.writeText(transaction.id);
    setCopiedId(true);
    toast.success('Transaction ID copied');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyRelated = () => {
    if (!transaction.relatedWalletId) return;
    navigator.clipboard.writeText(transaction.relatedWalletId);
    setCopiedRelated(true);
    toast.success('Wallet ID copied');
    setTimeout(() => setCopiedRelated(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="success">COMPLETED</Badge>;
      case 'PENDING':
        return <Badge variant="warning">PENDING</Badge>;
      case 'FAILED':
        return <Badge variant="danger">FAILED</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-screen max-w-md bg-card border-l border-border p-6 sm:p-8 flex flex-col justify-between shadow-2xl relative overflow-y-auto"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-bold text-foreground">Transaction Details</h3>
                  </div>
                  <button
                    onClick={onClose}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Amount Banner */}
                <div className="my-6 p-5 rounded-2xl bg-secondary/50 border border-border text-center">
                  <div className="flex justify-center mb-2">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isCredit
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-rose-500/15 text-rose-500'
                      }`}
                    >
                      {isCredit ? (
                        <ArrowDownLeft className="w-6 h-6" />
                      ) : (
                        <ArrowUpRight className="w-6 h-6" />
                      )}
                    </div>
                  </div>
                  <span className="text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                    {transaction.type.replace('_', ' ')}
                  </span>
                  <div
                    className={`text-3xl font-black font-mono mt-1 ${
                      isCredit
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {isCredit ? `+ ${formattedAmount}` : `- ${formattedAmount}`}
                  </div>
                  <div className="mt-2 flex justify-center">{getStatusBadge(transaction.status)}</div>
                </div>

                {/* Properties List */}
                <div className="space-y-4 text-xs">
                  {/* Transaction ID */}
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Transaction ID</span>
                    <div className="flex items-center gap-1.5 font-mono text-foreground font-bold">
                      <span>{transaction.id}</span>
                      <button
                        onClick={handleCopyId}
                        className="p-1 rounded hover:bg-secondary text-muted-foreground"
                      >
                        {copiedId ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Primary Wallet */}
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">My Account</span>
                    <span className="font-mono text-foreground font-medium">{transaction.walletId}</span>
                  </div>

                  {/* Related Wallet if applicable */}
                  {transaction.relatedWalletId && (
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">
                        {isCredit ? 'Sender Account' : 'Recipient Account'}
                      </span>
                      <div className="flex items-center gap-1.5 font-mono text-foreground font-medium">
                        <span>{transaction.relatedWalletId}</span>
                        <button
                          onClick={handleCopyRelated}
                          className="p-1 rounded hover:bg-secondary text-muted-foreground"
                        >
                          {copiedRelated ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Balance After */}
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Balance After Settlement</span>
                    <span className="font-mono text-foreground font-bold">{formattedBalanceAfter}</span>
                  </div>

                  {/* Reference Note */}
                  {transaction.reference && (
                    <div className="flex items-center justify-between py-2 border-b border-border">
                      <span className="text-muted-foreground">Narrative Reference</span>
                      <span className="text-foreground font-medium italic">"{transaction.reference}"</span>
                    </div>
                  )}

                  {/* Date & Time */}
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className="text-muted-foreground">Timestamp</span>
                    <span className="text-foreground">{formatDate(transaction.createdAt)}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-6 border-t border-border space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-[11px] text-primary">
                  <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                  <span>Double-entry ledger verified in PostgreSQL with ACID isolation.</span>
                </div>
                <Button variant="outline" size="md" className="w-full justify-center" onClick={onClose}>
                  Close Drawer
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}
