"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "approve"
  | "destructive"
  | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-teal-700 hover:bg-teal-800 text-white shadow-sm border border-teal-800/20",
  secondary:
    "bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 shadow-sm",
  approve:
    "bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-emerald-700/20",
  destructive:
    "bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 shadow-sm",
  ghost:
    "bg-transparent hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-transparent",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-[36px] text-xs px-3 py-1.5 rounded-lg gap-1.5",
  md: "min-h-10 text-sm px-4 py-2 rounded-lg gap-2",
  lg: "min-h-11 text-base px-5 py-2.5 rounded-lg gap-2.5",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      className = "",
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      "inline-flex items-center justify-center font-sans font-semibold cursor-pointer select-none active:scale-[0.99] transition-all focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
