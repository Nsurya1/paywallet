import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Eye,
  EyeOff,
  Copy,
  Check,
  PlusCircle,
  ArrowUpRight,
  QrCode,
  History,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { Wallet } from '@/types';
import { paiseToRupees } from '@/lib/currency';
import { CountUp } from '@/components/ui/CountUp';
import { toast } from 'sonner';

export interface HeroWalletCardProps {
  wallet: Wallet | null;
  isLoading?: boolean;
  onOpenAddMoney: () => void;
  onOpenSend: () => void;
  onOpenRequest: () => void;
  onOpenHistory: () => void;
}

export function HeroWalletCard({
  wallet,
  isLoading = false,
  onOpenAddMoney,
  onOpenSend,
  onOpenRequest,
  onOpenHistory,
}: HeroWalletCardProps) {
  const [showBalance, setShowBalance] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const balanceRupees = wallet ? paiseToRupees(wallet.balance) : 0;
  const walletId = wallet?.id || 'wal_mock847291a';

  const maskWalletId = (id: string) => {
    if (id.length <= 12) return id;
    return `${id.substring(0, 7)}••••${id.substring(id.length - 4)}`;
  };

  const handleCopyId = () => {
    if (!wallet?.id) return;
    navigator.clipboard.writeText(wallet.id);
    setCopied(true);
    toast.success('Wallet ID copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      {/* Outer ambient glow behind card */}
      <div className="absolute -inset-1 rounded-3xl bg-accent-gradient opacity-30 blur-xl group-hover:opacity-45 transition duration-500" />

      {/* Main Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#4F46E5] via-[#7C3AED] to-[#06B6D4] p-6 sm:p-8 text-white shadow-2xl"
      >
        {/* Subtle decorative glass rings in background */}
        <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-56 h-56 rounded-full bg-black/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col justify-between min-h-[220px]">
          {/* Top row: Chip, Contactless, Card Network Tag */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* EMV Smart Chip */}
              <div className="w-10 h-8 rounded-lg bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-100 border border-amber-400/50 shadow-inner flex items-center justify-center relative overflow-hidden">
                <div className="w-full h-[1px] bg-amber-600/40 absolute top-2.5" />
                <div className="w-full h-[1px] bg-amber-600/40 absolute bottom-2.5" />
                <div className="h-full w-[1px] bg-amber-600/40 absolute left-3" />
                <div className="h-full w-[1px] bg-amber-600/40 absolute right-3" />
              </div>

              {/* Contactless waves */}
              <Wifi className="w-5 h-5 text-white/80 rotate-90" />
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold tracking-wider uppercase text-white/95">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {wallet?.currency || 'INR'} • {wallet?.status || 'ACTIVE'}
              </span>
            </div>
          </div>

          {/* Middle row: Balance & Visibility Toggle */}
          <div className="my-6">
            <div className="flex items-center gap-2 text-white/80 text-xs sm:text-sm font-medium mb-1">
              <span>Available Ledger Balance</span>
              <button
                type="button"
                onClick={() => setShowBalance(!showBalance)}
                className="p-1 rounded-md hover:bg-white/15 text-white/80 hover:text-white transition-colors"
                aria-label={showBalance ? 'Hide balance' : 'Show balance'}
              >
                {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-baseline gap-2">
              {isLoading ? (
                <div className="h-10 w-48 rounded-xl bg-white/20 animate-pulse my-1" />
              ) : showBalance ? (
                <div className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-mono tracking-tight text-white drop-shadow-sm flex items-center">
                  <CountUp end={balanceRupees} prefix="₹" decimals={2} duration={0.8} />
                </div>
              ) : (
                <div className="text-3xl sm:text-4xl lg:text-5xl font-mono tracking-widest text-white/90 select-none py-1">
                  ₹ ••••••••
                </div>
              )}
            </div>
          </div>

          {/* Bottom row: Masked Wallet ID & Quick Copy */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-white/20">
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/70">Wallet ID:</span>
              <span className="font-mono text-xs sm:text-sm text-white/95 font-semibold tracking-wider">
                {maskWalletId(walletId)}
              </span>
              <button
                type="button"
                onClick={handleCopyId}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors"
                title="Copy Wallet ID"
                aria-label="Copy Wallet ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-white/80">
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Double-Entry Verified</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick Actions Strip */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={onOpenAddMoney}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-card border border-border hover:border-primary/50 text-foreground font-semibold text-xs sm:text-sm shadow-sm hover:shadow-glow-primary transition-all duration-200 group/btn"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
            <PlusCircle className="w-4 h-4" />
          </div>
          <span>Add Money</span>
        </button>

        <button
          type="button"
          onClick={onOpenSend}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-card border border-border hover:border-primary/50 text-foreground font-semibold text-xs sm:text-sm shadow-sm hover:shadow-glow-primary transition-all duration-200 group/btn"
        >
          <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center group-hover/btn:scale-110 transition-transform">
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <span>Send</span>
        </button>

        <button
          type="button"
          onClick={onOpenRequest}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-card border border-border hover:border-primary/50 text-foreground font-semibold text-xs sm:text-sm shadow-sm hover:shadow-glow-primary transition-all duration-200 group/btn"
        >
          <div className="w-7 h-7 rounded-lg bg-violet-500/15 text-violet-500 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
            <QrCode className="w-4 h-4" />
          </div>
          <span>Request</span>
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-card border border-border hover:border-primary/50 text-foreground font-semibold text-xs sm:text-sm shadow-sm hover:shadow-glow-primary transition-all duration-200 group/btn"
        >
          <div className="w-7 h-7 rounded-lg bg-cyan-500/15 text-cyan-500 flex items-center justify-center group-hover/btn:scale-110 transition-transform">
            <History className="w-4 h-4" />
          </div>
          <span>History</span>
        </button>
      </div>
    </div>
  );
}
