import React from "react";
import type { EvidenceState } from "@/types/echobridge.types";
import { getEvidenceStateToken } from "@/utils/theme-tokens";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  evidenceState?: EvidenceState;
  hover?: boolean;
  glow?: boolean;
  children: React.ReactNode;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      evidenceState,
      hover = false,
      glow = false,
      className = "",
      style,
      children,
      ...props
    },
    ref
  ) => {
    const stateToken = evidenceState
      ? getEvidenceStateToken(evidenceState)
      : null;

    const leftBorderStyle = stateToken
      ? { borderLeft: stateToken.border, ...style }
      : style;

    return (
      <div
        ref={ref}
        style={leftBorderStyle}
        className={`rounded-xl bg-white border border-slate-200 text-slate-900 shadow-sm ${
          hover ? "hover:bg-slate-50 hover:border-slate-300 transition-colors" : ""
        } ${glow ? "shadow-md" : ""} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
