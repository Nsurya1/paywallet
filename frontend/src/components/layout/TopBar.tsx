import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Search,
  Sun,
  Moon,
  Bell,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

export function TopBar() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="h-16 border-b border-border bg-card/60 backdrop-blur-xl sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      {/* Mobile Branding (visible only on mobile) */}
      <div className="flex items-center gap-2.5 md:hidden">
        <NavLink to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-accent-gradient flex items-center justify-center shadow-glow-primary">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-extrabold tracking-tight text-foreground">Paywallet</span>
        </NavLink>
      </div>

      {/* Search Input (Desktop) */}
      <div className="hidden md:flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            readOnly
            placeholder="Search transactions, recipients, wallets... (Ctrl + K)"
            className="w-full h-10 pl-9 pr-14 rounded-xl border border-border bg-secondary/50 text-xs text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            onClick={() => {
              // Open command palette when built
              window.dispatchEvent(new CustomEvent('open:command-palette'));
            }}
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground bg-card border border-border rounded shadow-xs">
            Ctrl K
          </kbd>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-10 h-10 rounded-xl border border-border bg-card/70 hover:bg-secondary/70 text-foreground flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Toggle theme"
        >
          {resolvedTheme === 'dark' ? (
            <Sun className="w-4 h-4 text-warning" />
          ) : (
            <Moon className="w-4 h-4 text-primary" />
          )}
        </button>

        {/* Notifications Bell */}
        <NavLink
          to="/notifications"
          title="Notifications"
          className="relative w-10 h-10 rounded-xl border border-border bg-card/70 hover:bg-secondary/70 text-foreground flex items-center justify-center transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary ring-2 ring-card" />
        </NavLink>

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1.5 sm:px-2.5 rounded-xl border border-border bg-card/70 hover:bg-secondary/70 transition-colors cursor-pointer"
            aria-expanded={userMenuOpen}
            aria-label="User profile menu"
          >
            <div className="w-7 h-7 rounded-lg bg-accent-gradient text-white font-bold text-xs flex items-center justify-center shadow-xs">
              {user?.username ? user.username.substring(0, 2).toUpperCase() : 'U'}
            </div>
            <span className="hidden sm:inline text-xs font-semibold text-foreground">
              {user?.username || 'Account'}
            </span>
            <ChevronDown className="hidden sm:inline w-3 h-3 text-muted-foreground" />
          </button>

          <AnimatePresence>
            {userMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setUserMenuOpen(false)}
                  aria-hidden="true"
                />
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-52 rounded-2xl bg-card border border-border shadow-xl p-2 z-40"
                >
                  <div className="px-3 py-2 border-b border-border/80">
                    <p className="text-xs font-bold text-foreground truncate">{user?.username}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                  </div>

                  <div className="py-1">
                    <NavLink
                      to="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-foreground hover:bg-secondary transition-colors"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      Settings & Profile
                    </NavLink>
                  </div>

                  <div className="pt-1 border-t border-border/80">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log Out
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
}
