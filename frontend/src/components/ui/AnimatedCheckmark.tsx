import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface AnimatedCheckmarkProps {
  size?: number;
  className?: string;
}

export function AnimatedCheckmark({ size = 56, className = '' }: AnimatedCheckmarkProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Circle */}
        <motion.circle
          cx="26"
          cy="26"
          r="24"
          stroke="currentColor"
          strokeWidth="3"
          className="text-success"
          initial={shouldReduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        />
        {/* Check Stroke */}
        <motion.path
          d="M15 27L22 34L37 19"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-success"
          initial={shouldReduceMotion ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1, ease: 'easeOut' }}
        />
      </svg>
    </div>
  );
}
