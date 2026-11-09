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
// 1. Loading Skeleton with Tech Progress Stepper
// ============================================================================

export interface LoadingSkeletonProps {
  steps?: string[];
  currentStepIndex?: number;
  message?: string;
  cardCount?: number;
}

export function LoadingSkeleton({
  steps = [
    "Parsing authorised sources...",
    "Redacting secrets & prompt injections...",
    "Running audience-scoped retrieval...",
    "Verifying verbatim quote spans...",
  ],
  currentStepIndex = 1,
  message = "Processing trust verification pipeline...",
  cardCount = 3,
}: LoadingSkeletonProps) {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Progress HUD */}
      <div className="p-6 rounded-xl bg-surface border border-border-subtle">
        <div className="flex items-center gap-3 mb-4">
          <Loader2 className="w-5 h-5 text-accent-cyan animate-spin" />
          <h4 className="text-sm font-semibold text-text-primary">{message}</h4>
        </div>

        {/* Step indicators */}
        <div className="space-y-2">
          {steps.map((step, idx) => {
            const isDone = idx < currentStepIndex;
            const isCurrent = idx === currentStepIndex;

            return (
              <div
                key={step}
                className={`flex items-center gap-2.5 text-xs font-mono transition-opacity ${
                  isCurrent
                    ? "text-accent-cyan font-bold"
                    : isDone
                    ? "text-emerald-400"
                    : "text-text-muted opacity-60"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : isCurrent ? (
                  <div className="w-2 h-2 rounded-full bg-accent-cyan animate-ping" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-border-subtle" />
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
            className="p-5 rounded-xl bg-surface/50 border border-border-subtle space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 bg-slate-800 rounded" />
              <div className="h-4 w-16 bg-slate-800 rounded" />
            </div>
            <div className="h-4 w-full bg-slate-800/70 rounded" />
            <div className="h-4 w-4/5 bg-slate-800/50 rounded" />
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
    <div className="w-full flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-xl border-2 border-dashed border-border-subtle bg-surface/30">
      <div className="p-3.5 rounded-xl bg-surface border border-border-subtle text-accent-cyan mb-4">
        {icon || <FolderSearch className="w-8 h-8" />}
      </div>
      <h3 className="text-base font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-sm text-text-secondary max-w-md mb-6 leading-relaxed">
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
  title = "Error Encountered",
  message,
  details,
  onRetry,
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="w-full p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start justify-between gap-4"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-rose-200">{title}</h4>
          <p className="text-xs text-rose-300/90 leading-relaxed">{message}</p>
          {details && (
            <pre className="mt-2 p-2 rounded bg-black/40 text-[11px] font-mono text-rose-300/80 overflow-x-auto">
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
        >
          Retry
        </Button>
      )}
    </div>
  );
}
