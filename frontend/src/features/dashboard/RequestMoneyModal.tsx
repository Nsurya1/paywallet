import React, { useState } from 'react';
import { QrCode, Copy, Check, Share2, ShieldCheck } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Wallet } from '@/types';
import { toast } from 'sonner';

export interface RequestMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: Wallet | null;
}

export function RequestMoneyModal({ isOpen, onClose, wallet }: RequestMoneyModalProps) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const walletId = wallet?.id || 'wal_mock847291a';
  const payLink = `https://paywallet.app/pay/${walletId}`;

  const handleCopyId = () => {
    navigator.clipboard.writeText(walletId);
    setCopiedId(true);
    toast.success('Wallet ID copied to clipboard');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(payLink);
    setCopiedLink(true);
    toast.success('Payment request link copied to clipboard');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Request Money"
      description="Share your Wallet ID or QR code to receive instant INR transfers"
      className="max-w-md"
    >
      <div className="space-y-5 text-center">
        {/* QR Code Container Mockup */}
        <div className="p-6 rounded-2xl bg-secondary/50 border border-border inline-flex flex-col items-center justify-center mx-auto shadow-inner">
          <div className="w-44 h-44 rounded-xl bg-white p-3 shadow-md flex items-center justify-center relative">
            <QrCode className="w-full h-full text-slate-900" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs shadow-md border-2 border-white">
                PW
              </div>
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground mt-3 font-medium">
            Scan to pay via Paywallet App
          </span>
        </div>

        {/* Wallet ID Row */}
        <div className="rounded-xl bg-card border border-border p-3 flex items-center justify-between text-left">
          <div className="min-w-0 pr-2">
            <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Your Wallet ID
            </span>
            <span className="font-mono text-xs font-bold text-foreground truncate block">
              {walletId}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyId} className="flex-shrink-0">
            {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
            <span>{copiedId ? 'Copied' : 'Copy'}</span>
          </Button>
        </div>

        {/* Share Link Row */}
        <div className="rounded-xl bg-card border border-border p-3 flex items-center justify-between text-left">
          <div className="min-w-0 pr-2">
            <span className="block text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Shareable Pay Link
            </span>
            <span className="font-mono text-xs text-muted-foreground truncate block">
              {payLink}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex-shrink-0">
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500 mr-1" /> : <Share2 className="w-3.5 h-3.5 mr-1" />}
            <span>{copiedLink ? 'Copied' : 'Share'}</span>
          </Button>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Zero fee transfers • Guaranteed ledger settlement</span>
        </div>
      </div>
    </Dialog>
  );
}
