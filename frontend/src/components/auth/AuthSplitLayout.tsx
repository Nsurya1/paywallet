import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldCheck, Sun, Moon, Star, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/hooks/useTheme';

interface AuthSplitLayoutProps {
  children: React.ReactNode;
  heading: string;
  subheading: string;
}

export function AuthSplitLayout({ children, heading, subheading }: AuthSplitLayoutProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-background text-foreground">
      {/* Left Form Panel */}
      <div className="lg:col-span-6 xl:col-span-5 flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 min-h-screen">
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <NavLink
            to="/"
            className="flex items-center gap-2.5 group select-none"
            title="Back to Landing Page"
          >
            <div className="w-9 h-9 rounded-xl bg-accent-gradient flex items-center justify-center shadow-glow-primary group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-foreground">Paywallet</span>
              <span className="text-[10px] font-bold text-success uppercase tracking-wider">
                Ledger Safe
              </span>
            </div>
          </NavLink>

          {/* Theme Toggle */}
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
        </div>

        {/* Center Content / Form */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {heading}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {subheading}
            </p>
          </div>

          {children}
        </div>

        {/* Footer */}
        <div className="text-xs text-muted-foreground text-center sm:text-left flex items-center justify-between pt-6 border-t border-border/60">
          <span>&copy; {new Date().getFullYear()} Paywallet Financial Inc.</span>
          <NavLink to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to Home
          </NavLink>
        </div>
      </div>

      {/* Right Gradient & Testimonial Panel (Desktop Only) */}
      <div className="lg:col-span-6 xl:col-span-7 hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-accent-gradient text-white relative overflow-hidden select-none">
        {/* Subtle Decorative Ambient Circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

        {/* Top Badges */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-xs">
            ⚡ 1,420 TPS Verified
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-400/20 backdrop-blur-md border border-emerald-400/30 text-emerald-200 shadow-xs">
            🔒 Zero Duplicate Debits
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md border border-white/20 text-white shadow-xs">
            ⏱ &lt; 15ms p99 Latency
          </span>
        </div>

        {/* Center Animated Graphic / Headline */}
        <div className="relative z-10 my-auto py-8 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <h2 className="text-3xl xl:text-4xl font-black leading-tight tracking-tight text-white mb-4">
              Send money at the speed of trust.
            </h2>
            <p className="text-white/80 text-base leading-relaxed">
              Every balance update is protected by mathematical conservation of value. Double-entry
              accounting, deterministic deadlock-free locking, and dual-tier idempotency built for modern financial workloads.
            </p>
          </motion.div>
        </div>

        {/* Bottom Testimonial Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15, ease: 'easeOut' }}
          className="relative z-10 rounded-2xl backdrop-blur-xl bg-white/10 border border-white/20 p-6 shadow-2xl max-w-lg"
        >
          <div className="flex items-center gap-1 text-amber-300 mb-3">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-300" />
            ))}
          </div>

          <p className="text-sm text-white/95 leading-relaxed italic mb-4 font-normal">
            &ldquo;Paywallet eliminated duplicate debits under our peak flash-sale loads. The
            two-phase Redis and PostgreSQL idempotency state machine delivers 100% replay integrity with zero ledger drift.&rdquo;
          </p>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 border border-white/30 text-white font-bold text-sm flex items-center justify-center">
              RS
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Rahul Sharma</h4>
              <p className="text-xs text-white/70">VP of Engineering, BharatFin Payments</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
