import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Receipt,
  Bell,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mobileNavItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard },
  { to: '/transfer', label: 'Transfer', icon: ArrowLeftRight },
  { to: '/transactions', label: 'Activity', icon: Receipt },
  { to: '/notifications', label: 'Alerts', icon: Bell },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/85 backdrop-blur-xl px-2 py-1.5 pb-safe flex items-center justify-around select-none">
      {mobileNavItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-150 text-[11px] font-semibold',
              isActive
                ? 'text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={cn(
                  'p-1 rounded-lg transition-transform',
                  isActive ? 'scale-110 bg-primary/10' : ''
                )}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="mt-0.5">{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
