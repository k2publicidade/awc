import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-rigor-blue focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-rigor-blue text-white shadow-xs',
        secondary: 'border-transparent bg-rigor-navy text-white',
        graphite: 'border-transparent bg-rigor-graphite text-white',
        outline: 'border-rigor-grey/40 text-rigor-navy bg-white/80',
        destructive: 'border-transparent bg-rigor-danger text-white',
        success: 'border-transparent bg-rigor-success text-white',
        warning: 'border-transparent bg-rigor-warning text-white',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
