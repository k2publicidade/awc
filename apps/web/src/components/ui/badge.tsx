import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-awc-orange focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-awc-orange text-white",
        secondary: "border-transparent bg-awc-dark text-white",
        destructive: "border-transparent bg-awc-danger text-white",
        success: "border-transparent bg-awc-success text-white",
        warning: "border-transparent bg-awc-warning text-white",
        outline: "text-awc-dark",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
