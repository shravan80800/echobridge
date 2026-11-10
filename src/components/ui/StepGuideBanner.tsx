"use client";

import React from "react";

interface StepGuideBannerProps {
  stepLabel: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Clean 1-line workflow instruction banner placed at the top of each workflow stage.
 */
export function StepGuideBanner({
  stepLabel,
  children,
  className = "",
}: StepGuideBannerProps) {
  return (
    <div
      className={`bg-teal-50/90 border border-teal-200 rounded-xl px-4 py-3 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 min-w-0">
        <span className="inline-flex items-center self-start sm:self-center shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-teal-700 text-white select-none">
          {stepLabel}
        </span>
        <p className="text-xs sm:text-sm text-slate-700 leading-snug">
          {children}
        </p>
      </div>
    </div>
  );
}
