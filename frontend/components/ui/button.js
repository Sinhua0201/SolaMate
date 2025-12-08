import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Button style variants using class-variance-authority
// Liquid Glass iOS-style buttons - WHITE THEME
const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/20 disabled:pointer-events-none disabled:opacity-50 active:scale-95',
  {
    variants: {
      variant: {
        default: 'bg-gradient-to-b from-purple-500 to-purple-600 backdrop-blur-sm border border-purple-400/30 text-white hover:from-purple-600 hover:to-purple-700 shadow-lg shadow-purple-500/20',
        destructive:
          'bg-gradient-to-b from-red-500 to-red-600 backdrop-blur-sm border border-red-400/30 text-white hover:from-red-600 hover:to-red-700',
        outline:
          'border border-black/10 bg-white/80 backdrop-blur-sm hover:bg-white hover:border-black/20 text-neutral-700',
        secondary:
          'bg-gradient-to-b from-neutral-100 to-neutral-200 backdrop-blur-sm border border-black/10 text-neutral-700 hover:from-neutral-200 hover:to-neutral-300',
        ghost: 'hover:bg-black/5 text-neutral-600 hover:text-neutral-800',
        link: 'text-purple-600 underline-offset-4 hover:underline hover:text-purple-700',
        glass: 'bg-white/80 backdrop-blur-md border border-black/10 text-neutral-700 hover:bg-white shadow-lg shadow-black/5',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-xl px-3',
        lg: 'h-11 rounded-xl px-8',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

/**
 * Button Component
 * Reusable button with multiple variants and sizes
 * Can render as child component using asChild prop
 */
const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  );
});
Button.displayName = 'Button';

export { Button, buttonVariants };

