import React from 'react';
import { Search, Filter, RotateCcw, Download, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface FilterState {
  search: string;
  type: string;
  status: string;
  datePreset: string;
  minAmount: string;
  maxAmount: string;
}

export interface TransactionFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  onExportCsv: () => void;
  totalResults: number;
}

export function TransactionFilters({
  filters,
  onFilterChange,
  onReset,
  onExportCsv,
  totalResults,
}: TransactionFiltersProps) {
  const handleChange = (field: keyof FilterState, value: string) => {
    onFilterChange({
      ...filters,
      [field]: value,
    });
  };

  const hasActiveFilters =
    filters.search ||
    filters.type ||
    filters.status ||
    filters.datePreset !== 'ALL' ||
    filters.minAmount ||
    filters.maxAmount;

  return (
    <div className="space-y-4">
      {/* Search & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, note, or wallet address..."
            value={filters.search}
            onChange={(e) => handleChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-secondary/50 border border-border rounded-xl text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onReset} className="text-xs flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="text-xs flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs">
        {/* Type Filter */}
        <div className="flex items-center gap-1.5 bg-secondary/40 border border-border rounded-xl px-2.5 py-1">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={filters.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="bg-transparent text-xs text-foreground font-medium focus:outline-none cursor-pointer pr-2"
          >
            <option value="">All Types</option>
            <option value="TRANSFER_CREDIT">Received (Credit)</option>
            <option value="TRANSFER_DEBIT">Sent (Debit)</option>
            <option value="TOPUP">Top-Up (Gateway)</option>
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-1.5 bg-secondary/40 border border-border rounded-xl px-2.5 py-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="bg-transparent text-xs text-foreground font-medium focus:outline-none cursor-pointer pr-2"
          >
            <option value="">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </select>
        </div>

        {/* Date Preset Filter */}
        <div className="flex items-center gap-1.5 bg-secondary/40 border border-border rounded-xl px-2.5 py-1">
          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
          <select
            value={filters.datePreset}
            onChange={(e) => handleChange('datePreset', e.target.value)}
            className="bg-transparent text-xs text-foreground font-medium focus:outline-none cursor-pointer pr-2"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="7D">Past 7 Days</option>
            <option value="30D">Past 30 Days</option>
          </select>
        </div>

        {/* Min Amount */}
        <div className="flex items-center gap-1 bg-secondary/40 border border-border rounded-xl px-2.5 py-1">
          <span className="text-muted-foreground font-mono">₹</span>
          <input
            type="number"
            min="0"
            placeholder="Min ₹"
            value={filters.minAmount}
            onChange={(e) => handleChange('minAmount', e.target.value)}
            className="w-16 bg-transparent text-xs font-mono text-foreground focus:outline-none"
          />
        </div>

        {/* Max Amount */}
        <div className="flex items-center gap-1 bg-secondary/40 border border-border rounded-xl px-2.5 py-1">
          <span className="text-muted-foreground font-mono">₹</span>
          <input
            type="number"
            min="0"
            placeholder="Max ₹"
            value={filters.maxAmount}
            onChange={(e) => handleChange('maxAmount', e.target.value)}
            className="w-16 bg-transparent text-xs font-mono text-foreground focus:outline-none"
          />
        </div>

        {/* Result Counter */}
        <div className="ml-auto text-[11px] text-muted-foreground font-medium">
          Showing <span className="font-bold text-foreground font-mono">{totalResults}</span> entries
        </div>
      </div>
    </div>
  );
}
