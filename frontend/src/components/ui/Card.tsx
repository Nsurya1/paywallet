import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'hero' | 'interactive';
  hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, ...props }, ref) => {
    let variantStyles = 'bg-card text-card-foreground border border-border shadow-card';

    if (variant === 'glass') {
      variantStyles = 'glass-card text-foreground shadow-card';
    } else if (variant === 'hero') {
      variantStyles = 'hero-glass text-white border-white/20';
    } else if (variant === 'interactive') {
      variantStyles =
        'bg-card text-card-foreground border border-border shadow-card hover:shadow-card-hover transition-all duration-200 cursor-pointer';
    }

    const hoverStyles = hover
      ? 'hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200'
      : '';

    return (
      <div
        ref={ref}
        className={cn('rounded-2xl overflow-hidden', variantStyles, hoverStyles, className)}
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

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pb-3', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-bold text-foreground', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-xs text-muted-foreground mt-1', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0 flex items-center justify-between', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';
