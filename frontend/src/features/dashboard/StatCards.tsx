import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, Scale } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { formatPaiseToRupees } from '@/lib/currency';

export interface StatCardsProps {
  totalInPaise: number;
  totalOutPaise: number;
  inflowCount?: number;
  outflowCount?: number;
  isLoading?: boolean;
}

export function StatCards({
  totalInPaise,
  totalOutPaise,
  inflowCount = 0,
  outflowCount = 0,
  isLoading = false,
}: StatCardsProps) {
  const netPaise = totalInPaise - totalOutPaise;
  const isNetPositive = netPaise >= 0;

  const stats = [
    {
      title: 'Money In (This Month)',
      amountPaise: totalInPaise,
      badge: '+14.2%',
      badgeType: 'success' as const,
      trendIcon: TrendingUp,
      icon: ArrowDownLeft,
      iconColor: 'text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20',
      description: `${inflowCount} deposits & transfers received`,
    },
    {
      title: 'Money Out (This Month)',
      amountPaise: totalOutPaise,
      badge: '+8.5%',
      badgeType: 'danger' as const,
      trendIcon: TrendingDown,
      icon: ArrowUpRight,
      iconColor: 'text-rose-500 bg-rose-500/10 dark:bg-rose-500/20',
      description: `${outflowCount} debits & payments settled`,
    },
    {
      title: 'Net Ledger Growth',
      amountPaise: Math.abs(netPaise),
      badge: isNetPositive ? '+61.5%' : '-12.0%',
      badgeType: isNetPositive ? ('success' as const) : ('danger' as const),
      trendIcon: isNetPositive ? TrendingUp : TrendingDown,
      icon: Scale,
      iconColor: 'text-primary bg-primary/10 dark:bg-primary/20',
      description: isNetPositive ? 'Positive cash flow surplus' : 'Net deficit this period',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
      {stats.map((stat, idx) => {
        const Icon = stat.icon;
        const TrendIcon = stat.trendIcon;

        return (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.08 }}
          >
            <Card hover className="p-5 sm:p-6 flex flex-col justify-between h-full relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {stat.title}
                </span>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="my-1">
                {isLoading ? (
                  <div className="h-8 w-32 rounded-lg bg-muted animate-pulse mb-2" />
                ) : (
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-foreground">
                    {formatPaiseToRupees(stat.amountPaise)}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-xs pt-3 border-t border-border mt-3">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                      stat.badgeType === 'success'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    <TrendIcon className="w-3 h-3" />
                    <span>{stat.badge}</span>
                  </span>
                  <span className="text-muted-foreground text-[11px]">vs last month</span>
                </div>
                <span className="text-[11px] text-muted-foreground truncate ml-2">
                  {stat.description}
                </span>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
