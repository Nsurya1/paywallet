import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'hero' | 'interactive';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    let variantStyles = 'bg-card text-card-foreground border border-border shadow-card';

    if (variant === 'glass') {
      variantStyles = 'glass-card text-foreground shadow-card';
    } else if (variant === 'hero') {
      variantStyles = 'hero-glass text-white border-white/20';
    } else if (variant === 'interactive') {
      variantStyles =
        'bg-card text-card-foreground border border-border shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer';
    }

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl overflow-hidden', variantStyles, className)}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

export const MotionCard = React.forwardRef<HTMLDivElement, HTMLMotionProps<'div'> & { variant?: 'default' | 'glass' | 'hero' }>(
  ({ className, variant = 'default', children, ...props }, ref) => {
    let variantStyles = 'bg-card text-card-foreground border border-border shadow-card';
    if (variant === 'glass') {
      variantStyles = 'glass-card text-foreground shadow-card';
    } else if (variant === 'hero') {
      variantStyles = 'hero-glass text-white border-white/20';
    }

    return (
      <motion.div
        ref={ref}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className={cn('rounded-2xl overflow-hidden', variantStyles, className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionCard.displayName = 'MotionCard';

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-bold tracking-tight text-foreground leading-none', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted-foreground leading-relaxed', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-6 pt-0', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center p-6 pt-0', className)} {...props} />;
}
