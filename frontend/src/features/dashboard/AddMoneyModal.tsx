import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard,
  QrCode,
  Building2,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AnimatedCheckmark } from '@/components/ui/AnimatedCheckmark';
import { Wallet, TopUpResponse } from '@/types';
import { rupeesToPaise, formatRupees, formatPaiseToRupees } from '@/lib/currency';
import { generateIdempotencyKey } from '@/lib/idempotency';
import { triggerConfetti } from '@/lib/confetti';
import { walletApi } from '@/api/walletApi';
import { toast } from 'sonner';

export interface AddMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: Wallet | null;
  onSuccess: () => void;
}

type Step = 'INPUT' | 'CONFIRM' | 'LOADING' | 'SUCCESS';
type PaymentMethod = 'UPI' | 'CARD' | 'NET_BANKING';

const QUICK_CHIPS = ['500', '1000', '5000', '10000'];

export function AddMoneyModal({ isOpen, onClose, wallet, onSuccess }: AddMoneyModalProps) {
  const [step, setStep] = useState<Step>('INPUT');
  const [amountInput, setAmountInput] = useState<string>('1000');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [error, setError] = useState<string | null>(null);
  const [topUpResult, setTopUpResult] = useState<TopUpResponse | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('INPUT');
      setAmountInput('1000');
      setPaymentMethod('UPI');
      setError(null);
      setTopUpResult(null);
    }
  }, [isOpen]);

  const numAmount = parseFloat(amountInput) || 0;
  const calculatedPaise = rupeesToPaise(amountInput);

  // Live validation
  const validateAmount = (val: string): boolean => {
    const num = parseFloat(val);
    if (!val || isNaN(num) || num <= 0) {
      setError('Please enter an amount greater than ₹0');
      return false;
    }
    if (num < 1) {
      setError('Minimum top-up amount is ₹1.00');
      return false;
    }
    if (num > 200000) {
      setError('Maximum top-up amount per transaction is ₹2,00,000.00');
      return false;
    }
    setError(null);
    return true;
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setAmountInput(val);
    validateAmount(val);
  };

  const handleChipClick = (chip: string) => {
    setAmountInput(chip);
    validateAmount(chip);
  };

  const handleProceedToConfirm = () => {
    if (validateAmount(amountInput)) {
      setStep('CONFIRM');
    }
  };

  const handleExecuteTopUp = async () => {
    if (!wallet) {
      toast.error('No active wallet found to deposit into.');
      return;
    }

    setStep('LOADING');
    const idempotencyKey = generateIdempotencyKey();

    try {
      const result = await walletApi.topUpWallet(
        wallet.id,
        calculatedPaise,
        `GATEWAY-${paymentMethod}-${Date.now().toString(36).toUpperCase()}`,
        idempotencyKey
      );

      setTopUpResult(result);
      setStep('SUCCESS');
      triggerConfetti();
      toast.success(`Successfully added ${formatRupees(numAmount)} to your wallet!`);
      onSuccess();
    } catch (err: unknown) {
      let msg = 'Failed to process top-up. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const respData = (err as { response?: { data?: { message?: string } } }).response?.data;
        if (respData?.message) msg = respData.message;
      }
      toast.error(msg);
      setStep('INPUT');
      setError(msg);
    }
  };

  const handleFinish = () => {
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (step !== 'LOADING') onClose();
      }}
      title={step === 'SUCCESS' ? undefined : 'Add Money to Wallet'}
      description={
        step === 'SUCCESS'
          ? undefined
          : 'Instant settlement into double-entry ledger with zero gateway fees'
      }
      className="max-w-md"
    >
      <AnimatePresence mode="wait">
        {/* STEP 1: AMOUNT INPUT & PAYMENT METHOD */}
        {step === 'INPUT' && (
          <motion.div
            key="step-input"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Big Amount Input Box */}
            <div className="rounded-2xl bg-secondary/50 border border-border p-5 text-center">
              <label htmlFor="topup-amount" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                Enter Amount (INR)
              </label>

              <div className="relative flex items-center justify-center">
                <span className="text-3xl sm:text-4xl font-extrabold text-foreground mr-1 select-none">
                  ₹
                </span>
                <input
                  id="topup-amount"
                  type="number"
                  min="1"
                  max="200000"
                  step="any"
                  autoFocus
                  value={amountInput}
                  onChange={handleAmountChange}
                  placeholder="0.00"
                  className="w-48 bg-transparent text-3xl sm:text-4xl font-extrabold font-mono text-foreground focus:outline-none text-left tracking-tight"
                />
              </div>

              {/* Calculated Paise Display */}
              <div className="mt-2 text-xs font-mono text-muted-foreground">
                Equivalent: <span className="font-semibold text-primary">{calculatedPaise.toLocaleString('en-IN')} paise</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-xs text-danger text-center font-medium animate-shake">
                {error}
              </p>
            )}

            {/* Quick Chips */}
            <div>
              <span className="block text-xs font-medium text-muted-foreground mb-2">
                Popular Quick Amounts
              </span>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_CHIPS.map((chip) => {
                  const isSelected = amountInput === chip;
                  return (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleChipClick(chip)}
                      className={`py-2 px-2 rounded-xl text-xs font-mono font-bold transition-all border ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary shadow-glow-primary'
                          : 'bg-card hover:bg-secondary border-border text-foreground'
                      }`}
                    >
                      +₹{parseInt(chip, 10).toLocaleString('en-IN')}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <span className="block text-xs font-medium text-muted-foreground mb-2">
                Select Deposit Method
              </span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'UPI', label: 'UPI / QR', icon: QrCode, desc: 'Google Pay, PhonePe' },
                  { id: 'CARD', label: 'Debit/Credit', icon: CreditCard, desc: 'Visa, RuPay' },
                  { id: 'NET_BANKING', label: 'Net Banking', icon: Building2, desc: 'HDFC, ICICI' },
                ].map(({ id, label, icon: Icon }) => {
                  const isSelected = paymentMethod === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id as PaymentMethod)}
                      className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-primary bg-primary/10 shadow-sm ring-1 ring-primary'
                          : 'border-border bg-card hover:bg-secondary/50'
                      }`}
                    >
                      <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <div className="text-xs font-bold text-foreground">{label}</div>
                        <div className="text-[10px] text-muted-foreground">Instant</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2">
              <Button
                variant="gradient"
                size="lg"
                className="w-full justify-center"
                disabled={!numAmount || !!error}
                onClick={handleProceedToConfirm}
              >
                <span>Review & Confirm</span>
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: REVIEW & CONFIRM */}
        {step === 'CONFIRM' && (
          <motion.div
            key="step-confirm"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Review Receipt Card */}
            <div className="rounded-2xl bg-secondary/50 border border-border p-5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-xs text-muted-foreground">Target Wallet</span>
                <span className="font-mono text-xs font-semibold text-foreground">
                  {wallet?.id.substring(0, 10)}•••
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-xs text-muted-foreground">Deposit Amount</span>
                <span className="font-mono text-sm font-bold text-foreground">
                  {formatRupees(numAmount)}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-xs text-muted-foreground">Payment Method</span>
                <Badge variant="outline" size="sm">
                  {paymentMethod}
                </Badge>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-border">
                <span className="text-xs text-muted-foreground">Convenience / Gateway Fee</span>
                <span className="text-xs font-bold text-emerald-500">₹0.00 (Zero Fee)</span>
              </div>

              <div className="flex items-center justify-between pt-1 text-sm font-bold">
                <span className="text-foreground">Total to Pay</span>
                <span className="font-mono text-base font-extrabold text-primary">
                  {formatRupees(numAmount)}
                </span>
              </div>
            </div>

            {/* Assurance Note */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Simulated gateway call guarantees immediate atomic ledger update.</span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => setStep('INPUT')}
              >
                <ArrowLeft className="w-4 h-4 mr-1.5" />
                <span>Back</span>
              </Button>
              <Button
                variant="gradient"
                size="lg"
                className="flex-[2] justify-center"
                onClick={handleExecuteTopUp}
              >
                <span>Authorize & Add Funds</span>
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: LOADING IN FLIGHT */}
        {step === 'LOADING' && (
          <motion.div
            key="step-loading"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="py-12 flex flex-col items-center justify-center text-center space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary relative">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div>
              <h4 className="text-base font-bold text-foreground">Processing Top-Up</h4>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">
                Authorizing mock payment gateway & writing double-entry ledger entries...
              </p>
            </div>
          </motion.div>
        )}

        {/* STEP 4: SUCCESS CONFIRMATION WITH CONFETTI */}
        {step === 'SUCCESS' && (
          <motion.div
            key="step-success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="py-4 text-center space-y-4"
          >
            {/* Animated Checkmark */}
            <div className="flex justify-center">
              <AnimatedCheckmark size={68} />
            </div>

            <div>
              <h3 className="text-xl font-black text-foreground tracking-tight">
                Money Added Successfully!
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Your wallet has been credited and settled on the ledger.
              </p>
            </div>

            {/* Big Success Amount */}
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <div className="text-xs font-semibold uppercase tracking-wider">Credited Amount</div>
              <div className="text-3xl font-extrabold font-mono mt-1">
                + {formatRupees(numAmount)}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground mt-1">
                Ref: {topUpResult?.transactionId || `TX-${Date.now().toString(36)}`}
              </div>
            </div>

            {/* Done button */}
            <div className="pt-2">
              <Button
                variant="gradient"
                size="lg"
                className="w-full justify-center"
                onClick={handleFinish}
              >
                <span>Done</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Dialog>
  );
}
