import React, { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { formatPaiseToRupees } from '@/lib/currency';

export interface CountUpProps {
  valuePaise: number;
  currency?: string;
  className?: string;
  duration?: number;
}

export function CountUp({
  valuePaise,
  currency = 'INR',
  className = '',
  duration = 0.3,
}: CountUpProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState<number>(valuePaise);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(valuePaise);
      return;
    }

    const controls = animate(displayValue, valuePaise, {
      duration: Math.min(duration, 0.3),
      ease: 'easeOut',
      onUpdate: (latest) => {
        setDisplayValue(Math.round(latest));
      },
    });

    return () => controls.stop();
  }, [valuePaise, duration, shouldReduceMotion]);

  return (
    <span className={`font-mono-numbers tracking-tight ${className}`}>
      {formatPaiseToRupees(displayValue, currency)}
    </span>
  );
}
