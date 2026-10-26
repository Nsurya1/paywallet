import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowRight,
  Zap,
  Lock,
  RotateCcw,
  CheckCircle2,
  Cpu,
  Layers,
  Database,
  Sun,
  Moon,
  ExternalLink,
  ChevronRight,
  Activity,
  FileCheck2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CountUp } from '@/components/ui/CountUp';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';

export function LandingPage() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-2.5 group select-none">
            <div className="w-9 h-9 rounded-xl bg-accent-gradient flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-foreground flex items-center gap-1.5">
                Paywallet
              </span>
              <span className="text-[9px] font-bold text-success uppercase tracking-wider -mt-1">
                Ledger Safe
              </span>
            </div>
          </NavLink>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#security" className="hover:text-foreground transition-colors">
              Security & Ledger
            </a>
            <a href="#architecture" className="hover:text-foreground transition-colors">
              Architecture
            </a>
            <a
              href="http://localhost:8085/swagger-ui.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <span>API Specs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>

          {/* Actions & Theme */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="w-9 h-9 rounded-xl border border-border bg-card hover:bg-secondary text-foreground flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-warning" />
              ) : (
                <Moon className="w-4 h-4 text-primary" />
              )}
            </button>

            {isAuthenticated ? (
              <NavLink to="/">
                <Button variant="gradient" size="sm">
                  <span>Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </NavLink>
            ) : (
              <>
                <NavLink to="/login" className="hidden sm:inline-block">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </NavLink>
                <NavLink to="/register">
                  <Button variant="gradient" size="sm">
                    <span>Get Started</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-20 pb-20 sm:pb-28 overflow-hidden">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-gradient-to-tr from-primary/20 via-violet-500/15 to-cyan-400/20 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Pill Badge */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold shadow-xs"
              >
                <Activity className="w-3.5 h-3.5 text-primary animate-pulse" />
                <span>Next-Gen Financial Ledger Platform</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-success font-semibold">1,420 TPS Benchmark</span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.05 }}
                className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight text-foreground leading-[1.12]"
              >
                Send money at the{' '}
                <span className="bg-gradient-to-r from-primary via-violet-500 to-cyan-500 bg-clip-text text-transparent">
                  speed of trust.
                </span>
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 }}
                className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto lg:mx-0"
              >
                Engineered from first principles with an immutable double-entry ledger,
                deterministic deadlock-free locking, and dual-tier idempotency. Sub-15ms settlements with
                provable zero balance divergence.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.15 }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2"
              >
                <NavLink to="/register" className="w-full sm:w-auto">
                  <Button variant="gradient" size="lg" className="w-full sm:w-auto text-base">
                    <span>Open Free Account</span>
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </NavLink>

                <NavLink to="/login" className="w-full sm:w-auto">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto text-base">
                    <span>Sign In to Demo</span>
                  </Button>
                </NavLink>
              </motion.div>

              {/* Key Trust Signals */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-5 pt-4 text-xs font-semibold text-muted-foreground"
              >
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>Zero Double Debits</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>Integer Minor Units (Paise)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>At-Least-Once Kafka Outbox</span>
                </div>
              </motion.div>
            </div>

            {/* Right Column: 3D Floating Card Mockup */}
            <div className="lg:col-span-5 flex justify-center relative select-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.92, rotateY: 10 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                whileHover={{ y: -6, rotateX: 2, rotateY: -2, transition: { duration: 0.2 } }}
                className="relative w-full max-w-sm sm:max-w-md perspective-1000"
              >
                {/* Main Hero Card */}
                <div className="relative rounded-3xl p-7 text-white hero-glass overflow-hidden shadow-2xl border border-white/25">
                  {/* Card Background Pattern Highlights */}
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-cyan-400/20 rounded-full blur-2xl pointer-events-none" />

                  {/* Top Bar of Card */}
                  <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-black text-sm">
                        PW
                      </div>
                      <span className="font-bold tracking-wider text-xs uppercase text-white/90">
                        Paywallet Black
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-mono font-bold bg-white/15 px-2.5 py-1 rounded-full border border-white/20">
                      <span>LEDGER ACTIVE</span>
                    </div>
                  </div>

                  {/* EMV Chip & Contactless Indicator */}
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="w-11 h-8 rounded-lg bg-gradient-to-tr from-amber-300 via-amber-200 to-amber-400 border border-amber-200/50 shadow-inner flex items-center justify-center">
                      <div className="w-7 h-5 border border-amber-600/40 rounded-sm grid grid-cols-2 gap-0.5 p-0.5">
                        <div className="bg-amber-600/20 rounded-xs" />
                        <div className="bg-amber-600/20 rounded-xs" />
                      </div>
                    </div>

                    {/* Contactless wave icon */}
                    <svg className="w-6 h-6 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.393 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                    </svg>
                  </div>

                  {/* Balance Display */}
                  <div className="space-y-1 mb-8 relative z-10">
                    <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                      Available Balance
                    </p>
                    <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-sm">
                      <CountUp valuePaise={12500050} />
                    </div>
                    <p className="text-[11px] text-white/70">12,500,050 paise · Verified Balanced</p>
                  </div>

                  {/* Masked Card Number & Holder */}
                  <div className="flex items-end justify-between pt-4 border-t border-white/20 relative z-10">
                    <div>
                      <p className="text-[10px] text-white/70 uppercase tracking-widest font-semibold">
                        Cardholder
                      </p>
                      <p className="text-sm font-bold tracking-wider text-white">RAHUL SHARMA</p>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] text-white/70 uppercase tracking-widest font-semibold">
                        Wallet ID
                      </p>
                      <p className="text-sm font-mono font-bold tracking-wider text-white">
                        •••• 8920
                      </p>
                    </div>
                  </div>
                </div>

                {/* Floating Micro-Badge 1: Instant Credit */}
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="absolute -top-4 -right-4 sm:-right-6 bg-card/90 backdrop-blur-xl border border-border p-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-20 text-xs font-bold text-foreground"
                >
                  <div className="w-7 h-7 rounded-lg bg-success/20 text-success flex items-center justify-center">
                    <Zap className="w-4 h-4 fill-success" />
                  </div>
                  <div>
                    <span className="text-success font-extrabold">+₹5,000.00</span>
                    <span className="block text-[10px] text-muted-foreground font-normal">
                      Instant Credit Settled
                    </span>
                  </div>
                </motion.div>

                {/* Floating Micro-Badge 2: Anti-Deadlock */}
                <motion.div
                  animate={{ y: [0, 6, 0] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
                  className="absolute -bottom-5 -left-4 sm:-left-6 bg-card/90 backdrop-blur-xl border border-border p-3 rounded-2xl shadow-xl flex items-center gap-2.5 z-20 text-xs font-bold text-foreground"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-foreground">Lock Order Invariant</span>
                    <span className="block text-[10px] text-muted-foreground font-normal">
                      0 Deadlock Aborts
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Banner */}
      <section className="border-y border-border bg-card/40 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-black text-foreground font-mono-numbers">
                1,420
              </p>
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-1">
                Transfers / Sec Throughput
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-foreground font-mono-numbers">
                &lt; 15 ms
              </p>
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-1">
                p99 Settlement Latency
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-success font-mono-numbers">
                0
              </p>
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-1">
                Double Debits & Deadlocks
              </p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-primary font-mono-numbers">
                100%
              </p>
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground mt-1">
                Double-Entry Ledger Verified
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section id="features" className="py-20 sm:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
          <Badge variant="default">Fintech Architectural Guarantees</Badge>
          <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
            Engineered for zero balance divergence.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Every layer of the Paywallet engine is designed to withstand concurrent traffic bursts,
            network retries, and hardware partition faults.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1: Instant Transfers */}
          <div className="group rounded-2xl bg-card border border-border p-8 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Instant Transfers</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Settle peer-to-peer transfers with sub-15ms p99 response times. Multi-strategy locking
              switches dynamically between pessimistic row locks (`SELECT FOR UPDATE`) and optimistic concurrency
              with exponential full-jitter retries.
            </p>
            <div className="flex items-center text-xs font-bold text-primary gap-1 group-hover:gap-2 transition-all">
              <span>Deterministic min/max lock ordering</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Feature 2: Bank-Grade Security */}
          <div className="group rounded-2xl bg-card border border-border p-8 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Bank-Grade Security</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Stateless JWT authentication with automatic 401 session lifecycle purging, BCrypt password hashing,
              and cryptographic HMAC-SHA256 signatures (`X-PayWallet-Signature`) verifying outbound event dispatch.
            </p>
            <div className="flex items-center text-xs font-bold text-violet-500 gap-1 group-hover:gap-2 transition-all">
              <span>Cryptographic event verification</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>

          {/* Feature 3: Zero Duplicate Payments */}
          <div className="group rounded-2xl bg-card border border-border p-8 shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all duration-200">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-500 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Zero Duplicate Payments</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-6">
              Distributed dual-storage idempotency engine. Fast-tier Redis cache (24h TTL) paired with
              PostgreSQL source of truth (`INSERT ... ON CONFLICT DO NOTHING`) and SHA-256 request payload hashing.
            </p>
            <div className="flex items-center text-xs font-bold text-cyan-500 gap-1 group-hover:gap-2 transition-all">
              <span>Exactly-once settlement semantics</span>
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </section>

      {/* Deep-Dive Architecture Preview Section */}
      <section id="architecture" className="py-16 bg-card/60 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="success">Core Ledger Architecture</Badge>
              <h2 className="text-3xl font-black text-foreground tracking-tight">
                Mathematical Conservation of Financial Value
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                Traditional wallets store a single mutating balance column, creating fatal race conditions.
                Paywallet implements strict double-entry bookkeeping: every credit is backed by an equal and
                opposite debit in an immutable append-only ledger journal.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-primary/10 text-primary mt-0.5">
                    <Database className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Integer Minor Units (Paise)</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Zero IEEE 754 floating-point inaccuracies. All transactions are evaluated in minor units.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-violet-500/10 text-violet-500 mt-0.5">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Transactional Outbox & Kafka KRaft</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Events published atomically in the same ACID transaction. Batch poller with `SKIP LOCKED`.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1 rounded-lg bg-cyan-500/10 text-cyan-500 mt-0.5">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Set-Based SQL Reconciliation</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Nightly automated verification detecting balance drift without loading millions of rows into heap.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Code Preview Box */}
            <div className="rounded-2xl border border-border bg-slate-950 p-6 font-mono text-xs text-slate-300 shadow-2xl overflow-x-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800 text-slate-500 text-[11px] mb-4">
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                  <span>TransferEngine.java</span>
                </span>
                <span>Deterministic Lock Ordering</span>
              </div>
              <pre className="leading-relaxed">
{`// 1. Sort wallet IDs to eliminate circular wait deadlocks
UUID firstId  = fromId.compareTo(toId) < 0 ? fromId : toId;
UUID secondId = fromId.compareTo(toId) < 0 ? toId : fromId;

// 2. Acquire exclusive pessimistic row locks in order
Wallet first  = walletRepo.findByIdForUpdate(firstId);
Wallet second = walletRepo.findByIdForUpdate(secondId);

// 3. Immutable Double-Entry Ledger Entry
ledgerRepo.save(new LedgerEntry(sender, -amount, "TRANSFER_DEBIT"));
ledgerRepo.save(new LedgerEntry(receiver, +amount, "TRANSFER_CREDIT"));

// 4. Atomic Transactional Outbox Event
outboxRepo.save(new OutboxEvent("WALLET_TRANSFERRED", payload));
// COMMIT -> ZERO double-debit guarantee`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl p-10 sm:p-14 bg-accent-gradient text-white shadow-2xl relative overflow-hidden text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-8">
          <div className="relative z-10 space-y-3 max-w-xl">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md border border-white/20">
              Ready to Upgrade?
            </span>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Experience the future of financial ledger engineering.
            </h2>
            <p className="text-white/80 text-sm leading-relaxed">
              Create an account in 30 seconds and test concurrent transfers with live idempotency replay.
            </p>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <NavLink to="/register" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto bg-white text-slate-900 hover:bg-slate-100 font-bold"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </NavLink>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-card/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-accent-gradient flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground">Paywallet Financial Inc.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="http://localhost:8085/swagger-ui.html" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Swagger API
            </a>
            <a href="http://localhost:8085/actuator/prometheus" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Prometheus Metrics
            </a>
            <a href="http://localhost:3001" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Grafana Dashboard
            </a>
          </div>

          <p>&copy; {new Date().getFullYear()} Paywallet. Concurrency-Safe Ledger Engine.</p>
        </div>
      </footer>
    </div>
  );
}
