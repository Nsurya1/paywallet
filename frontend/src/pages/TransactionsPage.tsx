import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt, RefreshCw, Download, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { walletApi, TransactionQueryParams } from '@/api/walletApi';
import { Wallet, Transaction } from '@/types';
import { formatPaiseToRupees, paiseToRupees } from '@/lib/currency';
import { formatDate } from '@/lib/formatDate';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TransactionTable, SortField, SortOrder } from '@/features/transactions/TransactionTable';
import { TransactionFilters, FilterState } from '@/features/transactions/TransactionFilters';
import { TransactionDrawer } from '@/features/transactions/TransactionDrawer';
import { toast } from 'sonner';

const DEFAULT_FILTERS: FilterState = {
  search: '',
  type: '',
  status: '',
  datePreset: 'ALL',
  minAmount: '',
  maxAmount: '',
};

export function TransactionsPage() {
  const { user } = useAuth();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loadingWallet, setLoadingWallet] = useState<boolean>(true);

  // Transactions & Pagination state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState<boolean>(false);
  const [totalElements, setTotalElements] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Filters
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);

  // Selected row for Drawer
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Fetch Wallet
  const loadWallet = useCallback(async () => {
    setLoadingWallet(true);
    try {
      const wallets = await walletApi.getWallets();
      if (wallets && wallets.length > 0) {
        setWallet(wallets[0]);
      } else {
        const created = await walletApi.createWallet('INR');
        setWallet(created);
      }
    } catch (err) {
      console.error('API error fetching wallet:', err);
      toast.error('Could not load wallet details.');
    } finally {
      setLoadingWallet(false);
    }
  }, [user]);

  // Fetch Transactions with Server & Client Filtering
  const loadTransactions = useCallback(async () => {
    if (!wallet) return;
    setIsLoadingTx(true);

    try {
      const params: TransactionQueryParams = {
        page: currentPage,
        size: pageSize,
      };

      if (filters.type) params.type = filters.type;
      if (filters.minAmount) params.minAmount = Number(filters.minAmount) * 100;
      if (filters.maxAmount) params.maxAmount = Number(filters.maxAmount) * 100;
      if (sortField) params.sort = `${sortField},${sortOrder}`;

      const data = await walletApi.getTransactions(wallet.id, params);

      if (data && data.content) {
        let items = data.content;

        // Apply client search filtering if provided
        if (filters.search.trim()) {
          const q = filters.search.toLowerCase().trim();
          items = items.filter(
            (tx) =>
              tx.id.toLowerCase().includes(q) ||
              (tx.reference && tx.reference.toLowerCase().includes(q)) ||
              (tx.relatedWalletId && tx.relatedWalletId.toLowerCase().includes(q))
          );
        }

        // Apply client status filter if provided
        if (filters.status) {
          items = items.filter((tx) => tx.status === filters.status);
        }

        setTransactions(items);
        setTotalElements(data.totalElements ?? items.length);
        setTotalPages(data.totalPages ?? Math.ceil(items.length / pageSize));
      }
    } catch (err) {
      console.error('API error loading transactions:', err);
      setTransactions([]);
      setTotalElements(0);
      setTotalPages(0);
      toast.error('Failed to load transaction history from the ledger.');
    } finally {
      setIsLoadingTx(false);
    }
  }, [wallet, currentPage, pageSize, filters, sortField, sortOrder]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    if (wallet) {
      loadTransactions();
    }
  }, [wallet, loadTransactions]);

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(0);
  };

  // CSV Export Utility
  const handleExportCsv = () => {
    if (transactions.length === 0) {
      toast.warning('No transactions available to export');
      return;
    }

    const headers = ['Transaction ID', 'Type', 'Amount (Rupees)', 'Balance After (Rupees)', 'Status', 'Reference', 'Timestamp'];
    const rows = transactions.map((tx) => [
      `"${tx.id}"`,
      `"${tx.type}"`,
      `"${paiseToRupees(tx.amount).toFixed(2)}"`,
      `"${paiseToRupees(tx.balanceAfter).toFixed(2)}"`,
      `"${tx.status}"`,
      `"${(tx.reference || '').replace(/"/g, '""')}"`,
      `"${tx.createdAt}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `paywallet-ledger-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Downloaded transactions CSV');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <span>Transaction Ledger</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              Double-Entry Journal
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Immutable settlement audit trail with serializable isolation & zero balance drift
          </p>
        </div>

        {/* Refresh Sync */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadTransactions()}
          disabled={isLoadingTx}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTx ? 'animate-spin' : ''}`} />
          <span>Sync Ledger</span>
        </Button>
      </div>

      {/* Filter & Search Bar */}
      <Card className="p-4 sm:p-5">
        <TransactionFilters
          filters={filters}
          onFilterChange={(f) => {
            setFilters(f);
            setCurrentPage(0);
          }}
          onReset={handleResetFilters}
          onExportCsv={handleExportCsv}
          totalResults={totalElements}
        />
      </Card>

      {/* Main Transactions Table */}
      <TransactionTable
        transactions={transactions}
        isLoading={isLoadingTx}
        totalElements={totalElements}
        totalPages={totalPages}
        currentPage={currentPage}
        pageSize={pageSize}
        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={handleSortChange}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(0);
        }}
        onSelectTransaction={(tx) => setSelectedTransaction(tx)}
        onResetFilters={handleResetFilters}
      />

      {/* Row-Click Transaction Detail Drawer */}
      <TransactionDrawer
        transaction={selectedTransaction}
        isOpen={!!selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
      />
    </div>
  );
}

export default TransactionsPage;
