import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Webhook,
  Sparkles,
  Trash2,
  Filter,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatRelativeTime } from '@/lib/formatDate';
import { toast } from 'sonner';

export type NotificationCategory = 'ALL' | 'UNREAD' | 'TRANSFERS' | 'SECURITY' | 'WEBHOOKS';

export interface NotificationItem {
  id: string;
  category: 'TRANSFERS' | 'SECURITY' | 'WEBHOOKS';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'CREDIT' | 'DEBIT' | 'SECURITY' | 'WEBHOOK';
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    category: 'TRANSFERS',
    title: 'Received Payment',
    message: 'Priya Sharma transferred ₹2,500.00 to your wallet with note "Project Milestone Bonus".',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    read: false,
    type: 'CREDIT',
  },
  {
    id: 'notif_2',
    category: 'TRANSFERS',
    title: 'Top-Up Credited',
    message: '₹10,000.00 deposited via UPI successfully into your primary INR wallet.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    read: false,
    type: 'CREDIT',
  },
  {
    id: 'notif_3',
    category: 'SECURITY',
    title: 'New Device Sign-in',
    message: 'New login authorized from Chrome on Windows 11 (IP: 192.168.1.45). If this was not you, review active sessions.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    read: false,
    type: 'SECURITY',
  },
  {
    id: 'notif_4',
    category: 'TRANSFERS',
    title: 'Outbound Transfer Settled',
    message: '₹450.00 settled to wal_92c43110 for Artisan Coffee Roasters with zero balance drift.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    type: 'DEBIT',
  },
  {
    id: 'notif_5',
    category: 'WEBHOOKS',
    title: 'Webhook Dispatched',
    message: 'Event WALLET_TRANSFERRED delivered with HTTP 200 OK to https://api.merchant.com/webhook.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    read: true,
    type: 'WEBHOOK',
  },
];

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<NotificationCategory>('ALL');

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'ALL') return true;
      if (activeTab === 'UNREAD') return !n.read;
      return n.category === activeTab;
    });
  }, [notifications, activeTab]);

  const handleMarkAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    toast.success('Marked as read');
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.info('Notification dismissed');
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'CREDIT':
        return (
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <ArrowDownLeft className="w-4 h-4" />
          </div>
        );
      case 'DEBIT':
        return (
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        );
      case 'SECURITY':
        return (
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-4 h-4" />
          </div>
        );
      case 'WEBHOOK':
      default:
        return (
          <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
            <Webhook className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            <span>Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="primary" size="sm">
                {unreadCount} unread
              </Badge>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Real-time ledger events, security alerts, and webhook status
          </p>
        </div>

        {/* Mark all as read button */}
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="flex items-center gap-1.5 self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all as read</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        {[
          { id: 'ALL', label: 'All' },
          { id: 'UNREAD', label: `Unread (${unreadCount})` },
          { id: 'TRANSFERS', label: 'Transfers' },
          { id: 'SECURITY', label: 'Security' },
          { id: 'WEBHOOKS', label: 'Webhooks' },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as NotificationCategory)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Notifications List Card */}
      <Card className="divide-y divide-border">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <EmptyState
              icon={Bell}
              title="All caught up!"
              description="You have no notifications matching this filter. New activity and settlement events will appear here."
            />
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors ${
                  !notif.read ? 'bg-primary/5 dark:bg-primary/10' : 'hover:bg-secondary/40'
                }`}
              >
                {/* Left: Icon, Dot & Content */}
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Unread dot or icon */}
                  <div className="relative mt-0.5">
                    {getNotificationIcon(notif.type)}
                    {!notif.read && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary border-2 border-card ring-2 ring-primary/30 animate-pulse" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-foreground truncate">
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <Badge variant="primary" size="sm" className="text-[10px] py-0 px-1.5">
                          NEW
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {notif.message}
                    </p>

                    <span className="text-[11px] text-muted-foreground/80 mt-2 block">
                      {formatRelativeTime(notif.timestamp)}
                    </span>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!notif.read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="p-1.5 rounded-lg border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="Mark as read"
                      aria-label="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(notif.id)}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="Dismiss"
                    aria-label="Dismiss notification"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </Card>
    </div>
  );
}

export default NotificationsPage;
