"use client";

import React from "react";
import {
  Loader2,
  AlertCircle,
  FolderSearch,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "./Button";

// ============================================================================
// 1. Loading Skeleton
// ============================================================================

export interface LoadingSkeletonProps {
  steps?: string[];
  currentStepIndex?: number;
  message?: string;
  cardCount?: number;
}

export function LoadingSkeleton({
  steps = [
    "Scanning authorised project files...",
    "Checking for sensitive secrets...",
    "Organising role access permissions...",
    "Preparing verifiable draft...",
  ],
  currentStepIndex = 1,
  message = "Preparing workspace...",
  cardCount = 3,
}: LoadingSkeletonProps) {
  return (
    <div className="w-full space-y-5 animate-pulse">
      {/* Progress Card */}
      <div className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-5 h-5 text-teal-700 animate-spin shrink-0" />
          <h4 className="text-sm font-semibold text-slate-900">{message}</h4>
        </div>

        {/* Step indicators */}
        <div className="space-y-2">
          {steps.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step}
                className={`flex items-center gap-2.5 text-xs font-sans transition-opacity ${
                  isCurrent
                    ? "text-teal-700 font-semibold"
                    : isDone
                    ? "text-emerald-700"
                    : "text-slate-400"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : isCurrent ? (
                  <div className="w-2 h-2 rounded-full bg-teal-600 animate-ping shrink-0" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
                )}
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shimmer Cards */}
      <div className="space-y-3">
        {Array.from({ length: cardCount }).map((_, idx) => (
          <div
            key={idx}
            className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-slate-200 rounded" />
              <div className="h-4 w-20 bg-slate-200 rounded" />
            </div>
            <div className="h-4 w-full bg-slate-100 rounded" />
            <div className="h-4 w-4/5 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 2. Empty State View
// ============================================================================

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border-2 border-dashed border-slate-300 bg-white">
      <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 mb-4">
        {icon || <FolderSearch className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {actionLabel && (
            <Button variant="primary" onClick={onAction}>
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && (
            <Button variant="secondary" onClick={onSecondaryAction}>
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 3. Error Banner
// ============================================================================

export interface ErrorBannerProps {
  title?: string;
  message: string;
  details?: string;
  onRetry?: () => void;
}

export function ErrorBanner({
  title = "Something went wrong",
  message,
  details,
  onRetry,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="w-full p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-rose-900">{title}</h4>
          <p className="text-sm text-rose-800 leading-relaxed">{message}</p>
          {details && (
            <pre className="mt-2 p-2.5 rounded-lg bg-white border border-rose-200 text-xs font-mono text-rose-800 overflow-x-auto">
              {details}
            </pre>
          )}
        </div>
      </div>

      {onRetry && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="shrink-0 self-end sm:self-center"
        >
          Retry
        </Button>
      )}
    </div>
  );
}
