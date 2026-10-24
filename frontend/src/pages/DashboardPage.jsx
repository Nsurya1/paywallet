import React, { useState, useEffect, useCallback } from 'react';
import { walletApi } from '../api/walletApi';
import { useToast } from '../context/ToastContext';
import WalletCard from '../components/WalletCard';
import TopUpModal from '../components/TopUpModal';
import TransferModal from '../components/TransferModal';
import TransactionTable from '../components/TransactionTable';
import { Wallet, Plus, RefreshCw, Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [filterType, setFilterType] = useState('');

  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingTx, setLoadingTx] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);

  const { addToast } = useToast();

  // Load Primary Wallet
  const loadWallet = useCallback(async () => {
    setLoadingWallet(true);
    try {
      const wallets = await walletApi.getWallets();
      if (wallets && wallets.length > 0) {
        setWallet(wallets[0]);
      } else {
        // Auto-create initial INR wallet if none exists
        const created = await walletApi.createWallet('INR');
        setWallet(created);
        addToast('Created initial INR currency wallet for your account.', 'success');
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to load wallet account', 'error');
    } finally {
      setLoadingWallet(false);
    }
  }, [addToast]);

  // Load Transactions
  const loadTransactions = useCallback(async () => {
    if (!wallet) return;
    setLoadingTx(true);
    try {
      const params = {
        page: currentPage,
        size: pageSize,
      };
      if (filterType) {
        params.type = filterType;
      }
      const data = await walletApi.getTransactions(wallet.id, params);
      setTransactions(data.content || []);
      setTotalElements(data.totalElements || 0);
      setTotalPages(data.totalPages || 0);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoadingTx(false);
    }
  }, [wallet, currentPage, pageSize, filterType]);

  useEffect(() => {
    loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    if (wallet) {
      loadTransactions();
    }
  }, [wallet, loadTransactions]);

  const handleRefreshAll = () => {
    loadWallet();
    loadTransactions();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Wallet Dashboard
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time balance snapshot & double-entry ledger settlement
          </p>
        </div>

        <button
          onClick={handleRefreshAll}
          disabled={loadingWallet || loadingTx}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 shadow-sm transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingWallet || loadingTx ? 'animate-spin' : ''}`} />
          <span>Sync State</span>
        </button>
      </div>

      {/* Wallet Card */}
      {loadingWallet ? (
        <div className="p-12 rounded-3xl bg-slate-900/50 border border-slate-800 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
          <span className="text-sm font-medium">Synchronizing balance with ledger...</span>
        </div>
      ) : wallet ? (
        <WalletCard
          wallet={wallet}
          onOpenTopUp={() => setIsTopUpOpen(true)}
          onOpenTransfer={() => setIsTransferOpen(true)}
        />
      ) : (
        <div className="p-10 rounded-3xl bg-slate-900/50 border border-slate-800 text-center">
          <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white">No Active Wallet Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-5">
            Create your primary INR currency wallet to begin funding and transferring money.
          </p>
          <button
            onClick={() => loadWallet()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-brand-600/30"
          >
            <Plus className="w-4 h-4" />
            <span>Create Wallet Account</span>
          </button>
        </div>
      )}

      {/* Transactions Table */}
      {wallet && (
        <TransactionTable
          transactions={transactions}
          totalElements={totalElements}
          totalPages={totalPages}
          currentPage={currentPage}
          pageSize={pageSize}
          filterType={filterType}
          onFilterTypeChange={(type) => {
            setFilterType(type);
            setCurrentPage(0);
          }}
          onPageChange={setCurrentPage}
          onRefresh={loadTransactions}
          loading={loadingTx}
        />
      )}

      {/* Modals */}
      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setIsTopUpOpen(false)}
        wallet={wallet}
        onSuccess={() => {
          loadWallet();
          loadTransactions();
        }}
      />

      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        wallet={wallet}
        onSuccess={() => {
          loadWallet();
          loadTransactions();
        }}
      />
    </div>
  );
}
