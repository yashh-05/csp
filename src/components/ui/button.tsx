import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

/**
 * Reusable, production-grade Button component.
 * Implements styling rules matching the community design guidelines.
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          // Variant mappings
          variant === 'default' && "bg-primary text-primary-foreground hover:bg-primary/95 shadow-sm",
          variant === 'destructive' && "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
          variant === 'outline' && "border border-input bg-background hover:bg-secondary hover:text-secondary-foreground",
          variant === 'secondary' && "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border shadow-sm",
          variant === 'ghost' && "hover:bg-secondary hover:text-secondary-foreground",
          variant === 'link' && "text-primary underline-offset-4 hover:underline",
          // Size mappings
          size === 'default' && "h-10 px-4 py-2",
          size === 'sm' && "h-9 rounded-md px-3",
          size === 'lg' && "h-11 rounded-md px-8",
          size === 'icon' && "h-10 w-10",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
export default Button;
