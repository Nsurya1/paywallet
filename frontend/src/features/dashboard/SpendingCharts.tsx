import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { formatRupees } from '@/lib/currency';

type TimeRange = '7D' | '30D' | '90D';

const AREA_DATA_7D = [
  { date: 'Mon', spent: 1200, received: 4500 },
  { date: 'Tue', spent: 3400, received: 1200 },
  { date: 'Wed', spent: 1800, received: 8500 },
  { date: 'Thu', spent: 5200, received: 3200 },
  { date: 'Fri', spent: 4100, received: 14000 },
  { date: 'Sat', spent: 6800, received: 2100 },
  { date: 'Sun', spent: 2900, received: 5000 },
];

const AREA_DATA_30D = [
  { date: 'Week 1', spent: 12500, received: 28000 },
  { date: 'Week 2', spent: 18400, received: 22000 },
  { date: 'Week 3', spent: 14200, received: 35000 },
  { date: 'Week 4', spent: 9800, received: 16000 },
];

const AREA_DATA_90D = [
  { date: 'Month 1', spent: 54000, received: 89000 },
  { date: 'Month 2', spent: 62000, received: 95000 },
  { date: 'Month 3', spent: 48000, received: 84000 },
];

const DONUT_DATA = [
  { name: 'Peer Transfers', value: 18400, color: '#4F46E5' },
  { name: 'Bills & Utilities', value: 10500, color: '#7C3AED' },
  { name: 'Shopping & POS', value: 7800, color: '#06B6D4' },
  { name: 'Subscriptions', value: 4300, color: '#F59E0B' },
  { name: 'Investments', value: 2600, color: '#10B981' },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}

const CustomAreaTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl bg-card/95 backdrop-blur-md border border-border p-3 shadow-xl text-xs">
        <p className="font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((entry, index) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4 py-0.5">
            <span className="flex items-center gap-1.5 text-muted-foreground capitalize">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-foreground">
              {formatRupees(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CustomDonutTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="rounded-xl bg-card/95 backdrop-blur-md border border-border p-3 shadow-xl text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-foreground mb-1">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
          {data.name}
        </div>
        <p className="font-mono font-bold text-foreground text-sm">
          {formatRupees(data.value)}
        </p>
      </div>
    );
  }
  return null;
};

export function SpendingCharts() {
  const [timeRange, setTimeRange] = useState<TimeRange>('7D');

  const getAreaData = () => {
    switch (timeRange) {
      case '30D':
        return AREA_DATA_30D;
      case '90D':
        return AREA_DATA_90D;
      case '7D':
      default:
        return AREA_DATA_7D;
    }
  };

  const totalCategorySpend = DONUT_DATA.reduce((acc, cur) => acc + cur.value, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Velocity Area Chart (8 columns on lg) */}
      <Card className="lg:col-span-8 p-5 sm:p-6 flex flex-col justify-between">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-foreground">Spending & Cash Velocity</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Net balance movements and debits over time
            </p>
          </div>

          {/* Time range selector tabs */}
          <div className="inline-flex rounded-xl bg-secondary/80 p-1 border border-border self-start sm:self-auto">
            {(['7D', '30D', '90D'] as TimeRange[]).map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  timeRange === range
                    ? 'bg-card text-foreground shadow-sm font-bold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Recharts Area Chart */}
        <div className="h-64 sm:h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={getAreaData()} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
              <XAxis
                dataKey="date"
                stroke="currentColor"
                className="text-[11px] text-muted-foreground"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="currentColor"
                className="text-[11px] text-muted-foreground font-mono"
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip content={<CustomAreaTooltip />} />
              <Area
                type="monotone"
                dataKey="received"
                name="Inflow"
                stroke="#10B981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorReceived)"
              />
              <Area
                type="monotone"
                dataKey="spent"
                name="Outflow"
                stroke="#4F46E5"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorSpent)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend bottom */}
        <div className="flex items-center justify-center gap-6 pt-3 border-t border-border mt-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Inflow (Credits)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            <span className="text-muted-foreground">Outflow (Debits)</span>
          </div>
        </div>
      </Card>

      {/* Donut Chart (4 columns on lg) */}
      <Card className="lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-base font-bold text-foreground">Spending Breakdown</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Category distribution this month
          </p>
        </div>

        <div className="h-52 w-full my-2 relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={DONUT_DATA}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {DONUT_DATA.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip content={<CustomDonutTooltip />} />
            </PieChart>
          </ResponsiveContainer>

          {/* Centered Total in Donut */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              Total Spent
            </span>
            <span className="text-sm font-extrabold font-mono text-foreground">
              {formatRupees(totalCategorySpend)}
            </span>
          </div>
        </div>

        {/* Category List */}
        <div className="space-y-2 pt-2 border-t border-border">
          {DONUT_DATA.map((item) => {
            const percentage = Math.round((item.value / totalCategorySpend) * 100);
            return (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground truncate">{item.name}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-semibold text-foreground">{formatRupees(item.value)}</span>
                  <span className="text-muted-foreground text-[10px] w-8 text-right">{percentage}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
