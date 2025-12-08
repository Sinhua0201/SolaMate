import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Card Component - Liquid Glass Style WHITE THEME
 * Container component for grouping content with iOS-style glass effect
 */
const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      // Liquid Glass Effect - White Theme
      'rounded-2xl',
      'bg-gradient-to-b from-white/90 to-white/70',
      'backdrop-blur-xl',
      'border border-black/5',
      'shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,1)]',
      'text-neutral-800',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

/**
 * Card Header
 * Top section of the card, typically contains title and description
 */
const CardHeader = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

/**
 * Card Title
 * Main heading for the card
 */
const CardTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      'text-2xl font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

/**
 * Card Description
 * Subtitle or description text for the card
 */
const CardDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

/**
 * Card Content
 * Main content area of the card
 */
const CardContent = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

/**
 * Card Footer
 * Bottom section of the card, typically for actions
 */
const CardFooter = React.forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };

