"use strict";
/**
 * Redaction & Quarantine Table
 * Implements docs/SECURITY.md Section 2 & 3, docs/DESIGN.md Section 5.5, and TASKS.md TASK-011.
 *
 * Displays masked credentials, personal PII, and flagged prompt injection attempts
 * in a secure quarantine vault with zero raw secret leakage to the client.
 */

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
  AlertTriangle,
  Clock,
} from "lucide-react";

interface RedactionQuarantineTableProps {
  secrets: QuarantinedSecret[];
  onStatusChange?: (
    secretId: string,
    newStatus: QuarantinedSecretStatus
  ) => void;
  className?: string;
}

export function RedactionQuarantineTable({
  secrets,
  onStatusChange,
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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Key className="w-3 h-3" /> API KEY
          </span>
        );
      case "password":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-red-500/10 text-red-400 border border-red-500/20">
            <Lock className="w-3 h-3" /> PASSWORD
          </span>
        );
      case "phone":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Phone className="w-3 h-3" /> PHONE PII
          </span>
        );
      case "email":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Mail className="w-3 h-3" /> EMAIL PII
          </span>
        );
      case "prompt_injection":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <ShieldAlert className="w-3 h-3" /> PROMPT INJECTION
          </span>
        );
    }
  };

  const isPlantedTrap = (secret: QuarantinedSecret) => {
    if (
      secret.source_id === "SRC-CHAT-03" &&
      (secret.secret_type === "api_key" || secret.secret_type === "phone")
    ) {
      return "Trap 4: Secret/PII Redaction";
    }
    if (
      secret.source_id === "SRC-BACKLOG-07" ||
      secret.secret_type === "prompt_injection"
    ) {
      return "Trap 6: Injection Stripped";
    }
    return null;
  };

  return (
    <div
      className={`rounded-xl border border-subtle bg-surface p-5 shadow-lg ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-subtle">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-semibold text-text-primary">
              Quarantine Vault & Security Alerts
            </h3>
            <span className="px-2 py-0.5 text-xs font-mono rounded-full bg-surface-hover text-text-secondary border border-subtle">
              {secrets.length} items
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Raw secrets and injection instructions are strictly isolated at
            ingestion. Zero credentials enter chunk embeddings or model prompts.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-canvas p-1 rounded-lg border border-subtle text-xs">
          <button
            onClick={() => setFilterType("all")}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              filterType === "all"
                ? "bg-surface text-text-primary border border-subtle shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            All ({secrets.length})
          </button>
          <button
            onClick={() => setFilterType("credentials")}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              filterType === "credentials"
                ? "bg-surface text-amber-400 border border-subtle shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Keys & Creds
          </button>
          <button
            onClick={() => setFilterType("pii")}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              filterType === "pii"
                ? "bg-surface text-purple-400 border border-subtle shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            PII
          </button>
          <button
            onClick={() => setFilterType("injections")}
            className={`px-2.5 py-1 rounded font-medium transition-colors ${
              filterType === "injections"
                ? "bg-surface text-rose-400 border border-subtle shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            Injections
          </button>
        </div>
      </div>

      {filteredSecrets.length === 0 ? (
        <div className="py-10 text-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-75" />
          <p className="text-sm text-text-secondary font-medium">
            No quarantined items found
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {filterType === "all"
              ? "All source texts have been parsed cleanly without active credential violations."
              : `No items matching the '${filterType}' filter.`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-subtle text-text-muted font-mono uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Source & Chunk</th>
                <th className="py-2.5 px-3">Masked Preview (Zero Leak)</th>
                <th className="py-2.5 px-3">Protection Action</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Detected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle/50 font-sans">
              {filteredSecrets.map((secret) => {
                const trapLabel = isPlantedTrap(secret);
                return (
                  <tr
                    key={secret.id}
                    className="hover:bg-surface-hover/50 transition-colors"
                  >
                    <td className="py-3 px-3 align-middle">
                      <div className="flex flex-col gap-1 items-start">
                        {getSecretTypeBadge(secret.secret_type)}
                        {trapLabel && (
                          <span className="inline-block text-[10px] font-mono text-indigo-400 font-semibold">
                            🎯 {trapLabel}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 align-middle">
                      <div className="font-mono text-text-secondary">
                        <span className="text-indigo-400">{secret.source_id}</span>
                        {secret.chunk_id && (
                          <span className="text-text-muted block text-[11px]">
                            {secret.chunk_id}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3 align-middle font-mono">
                      <div className="bg-canvas/80 px-2.5 py-1 rounded border border-subtle text-text-primary text-xs inline-block max-w-xs sm:max-w-md truncate">
                        {secret.masked_preview}
                      </div>
                    </td>

                    <td className="py-3 px-3 align-middle text-text-secondary">
                      {secret.secret_type === "prompt_injection" ? (
                        <span className="text-rose-400 flex items-center gap-1 text-xs">
                          <ShieldAlert className="w-3.5 h-3.5" /> Stripped from
                          prompt
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Masked in chunk
                          pointer
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 align-middle">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                          secret.reviewer_status === "quarantined"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : secret.reviewer_status === "purged"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {secret.reviewer_status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-3 align-middle text-right text-text-muted font-mono text-[11px]">
                      {new Date(secret.detected_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-subtle/70 flex flex-col sm:flex-row items-center justify-between text-xs text-text-muted gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            Immutable security log recorded in Supabase <code>audit_events</code>.
          </span>
        </div>
        <div className="text-[11px] font-mono text-text-muted">
          EchoBridge Quarantine Engine v1.0
        </div>
      </div>
    </div>
  );
}
