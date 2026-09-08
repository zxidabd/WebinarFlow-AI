'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border border-primary/20',
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm border border-primary/20',
        yellow: 'bg-yellow-400 text-neutral-950 hover:bg-yellow-300 font-semibold border border-yellow-500/20 shadow-sm',
        accent: 'bg-yellow-400 text-neutral-950 hover:bg-yellow-300 font-semibold border border-yellow-500/20 shadow-sm',
        secondary: 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80 shadow-sm',
        outline: 'bg-transparent text-foreground border border-border hover:bg-muted hover:text-foreground',
        ghost: 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline p-0 h-auto font-normal',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm',
      },
      size: {
        default: 'h-10 px-4 py-2 text-sm',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-6 text-base',
        icon: 'h-10 w-10 p-0',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
