import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold ring-offset-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rigor-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'bg-rigor-blue text-white shadow-sm hover:bg-rigor-blue-dark hover:shadow-md hover:shadow-rigor-blue/20',
        destructive: 'bg-rigor-danger text-white hover:bg-rigor-danger/90',
        outline: 'border border-rigor-grey/40 bg-white text-rigor-navy hover:bg-rigor-white hover:border-rigor-blue hover:text-rigor-blue',
        secondary: 'bg-rigor-navy text-white hover:bg-rigor-navy-light shadow-sm',
        ghost: 'hover:bg-rigor-white hover:text-rigor-navy',
        link: 'text-rigor-blue underline-offset-4 hover:underline',
        success: 'bg-rigor-success text-white hover:bg-rigor-success/90',
        warning: 'bg-rigor-warning text-white hover:bg-rigor-warning/90',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3 text-xs',
        lg: 'h-11 rounded-xl px-8 text-base font-bold',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
