"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "3xl";
  closeOnBackdropClick?: boolean;
}

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "3xl": "max-w-4xl",
};

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = "lg",
  closeOnBackdropClick = true,
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Light Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px] transition-opacity"
        onClick={() => {
          if (closeOnBackdropClick) onClose();
        }}
      />

      {/* Dialog Window */}
      <div
        className={`relative z-10 my-auto max-h-[92vh] overflow-y-auto w-full ${maxWidthClasses[maxWidth]} bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-2xl text-slate-900`}
      >
        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
            <div>
              {title && (
                <h3
                  id="modal-title"
                  className="text-lg font-semibold tracking-tight text-slate-900"
                >
                  {title}
                </h3>
              )}
              {description && (
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 rounded-lg p-1.5 hover:bg-slate-100 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-600"
              aria-label="Close dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="text-sm text-slate-700">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 pt-5 mt-5 border-t border-slate-200">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
