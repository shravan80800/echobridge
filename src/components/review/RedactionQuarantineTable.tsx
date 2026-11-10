"use client";

import React, { useState } from "react";
import type {
  QuarantinedSecret,
  QuarantinedSecretStatus,
  SecretType,
} from "@/types/echobridge.types";
import {
  Key,
  Phone,
  Mail,
  Lock,
  ShieldAlert,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

interface RedactionQuarantineTableProps {
  secrets: QuarantinedSecret[];
  onStatusChange?: (
    secretId: string,
    newStatus: QuarantinedSecretStatus
  ) => void;
  className?: string;
}

const SOURCE_LABELS: Record<string, string> = {
  "SRC-CHAT-03": "Team Chat Export (March)",
  "SRC-BACKLOG-07": "Feature Backlog Notes",
  "SRC-ARCH-01": "Architecture Doc v2",
  "SRC-GIT-02": "GitHub PR #12 Export",
  "SRC-PLAN-04": "Event Planning Doc",
  "SRC-RUNBOOK-05": "Deployment Runbook",
  "SRC-FIN-06": "Finance & Sponsorship Folder",
  "SRC-TASK-08": "Sprint Task Board",
};

export function RedactionQuarantineTable({
  secrets,
  className = "",
}: RedactionQuarantineTableProps) {
  const [filterType, setFilterType] = useState<string>("all");

  const filteredSecrets = secrets.filter((s) => {
    if (filterType === "all") return true;
    if (filterType === "credentials")
      return s.secret_type === "api_key" || s.secret_type === "password";
    if (filterType === "pii")
      return s.secret_type === "phone" || s.secret_type === "email";
    if (filterType === "injections")
      return s.secret_type === "prompt_injection";
    return true;
  });

  const getSecretTypeBadge = (type: SecretType) => {
    switch (type) {
      case "api_key":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200 cursor-default select-none">
            <Key className="w-3 h-3 shrink-0" />
            <span>API Key</span>
          </span>
        );
      case "password":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 cursor-default select-none">
            <Lock className="w-3 h-3 shrink-0" />
            <span>Password</span>
          </span>
        );
      case "phone":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-800 border border-purple-200 cursor-default select-none">
            <Phone className="w-3 h-3 shrink-0" />
            <span>Phone Number</span>
          </span>
        );
      case "email":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 cursor-default select-none">
            <Mail className="w-3 h-3 shrink-0" />
            <span>Email Address</span>
          </span>
        );
      case "prompt_injection":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-800 border border-rose-200 cursor-default select-none">
            <ShieldAlert className="w-3 h-3 shrink-0" />
            <span>Unsafe Instruction</span>
          </span>
        );
    }
  };

  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}
    >
      {/* Header & Filter Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldAlert className="w-5 h-5 text-teal-700 shrink-0" />
            <h3 className="text-base font-semibold text-slate-900">
              Hidden &amp; Quarantined Items
            </h3>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 cursor-default select-none">
              {secrets.length} items protected
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600">
            Sensitive keys, phone numbers, and unsafe instructions are hidden before any handover draft is created.
          </p>
        </div>

        {/* Clean Filter Switcher */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs overflow-x-auto scrollbar-none shrink-0">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filterType === "all"
                ? "bg-white text-slate-900 border border-slate-200 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All ({secrets.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("credentials")}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filterType === "credentials"
                ? "bg-white text-slate-900 border border-slate-200 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Keys
          </button>
          <button
            type="button"
            onClick={() => setFilterType("pii")}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filterType === "pii"
                ? "bg-white text-slate-900 border border-slate-200 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Personal Info
          </button>
          <button
            type="button"
            onClick={() => setFilterType("injections")}
            className={`px-2.5 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap cursor-pointer ${
              filterType === "injections"
                ? "bg-white text-slate-900 border border-slate-200 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Unsafe Text
          </button>
        </div>
      </div>

      {/* Items List (Responsive, Zero Horizontal Scroll on Mobile) */}
      {filteredSecrets.length === 0 ? (
        <div className="py-10 px-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <p className="text-sm text-slate-800 font-medium">
            No hidden items in this filter
          </p>
          <p className="text-xs text-slate-500 mt-1">
            All project files were scanned cleanly.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {filteredSecrets.map((secret) => {
            const isInjection = secret.secret_type === "prompt_injection";
            const sourceName =
              SOURCE_LABELS[secret.source_id] || secret.source_id;

            return (
              <div
                key={secret.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getSecretTypeBadge(secret.secret_type)}
                    <span className="text-xs text-slate-600 font-medium">
                      Found in <span className="text-slate-900">{sourceName}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500">Masked preview:</span>
                    <code className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800 font-mono text-xs break-all">
                      {secret.masked_preview}
                    </code>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-default select-none ${
                      isInjection
                        ? "bg-rose-50 text-rose-800 border-rose-200"
                        : "bg-emerald-50 text-emerald-800 border-emerald-200"
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isInjection ? "Removed safely" : "Masked & quarantined"}
                    </span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
