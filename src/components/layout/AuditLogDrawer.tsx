"use client";

import React, { useState, useEffect } from "react";
import {
  Terminal,
  X,
  RefreshCw,
  ShieldAlert,
  KeyRound,
  FileCheck2,
  Users,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { useRole } from "./RoleContext";
import type { AuditEvent, AuditEventType } from "@/types/echobridge.types";

const eventIconMap: Partial<
  Record<AuditEventType, React.ComponentType<{ className?: string }>>
> = {
  secret_quarantined: KeyRound,
  injection_flagged: ShieldAlert,
  access_denied_guard: ShieldAlert,
  handover_approved: FileCheck2,
  role_switched: Users,
};

const eventBadgeColors: Partial<Record<AuditEventType, string>> = {
  secret_quarantined: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  injection_flagged: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  access_denied_guard: "bg-rose-500/20 text-rose-400 border-rose-500/40",
  handover_approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  role_switched: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
  draft_generated: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  gap_answered: "bg-blue-500/15 text-blue-300 border-blue-500/30",
};

export function AuditLogDrawer() {
  const { isAuditDrawerOpen, closeAuditDrawer } = useRole();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const fetchAuditEvents = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/audit?projectId=CampusConnect&limit=50");
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      }
    } catch {
      // Fallback in case of network issue
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuditDrawerOpen) {
      fetchAuditEvents();
    }
  }, [isAuditDrawerOpen]);

  if (!isAuditDrawerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Audit Log Terminal"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={closeAuditDrawer}
      />

      {/* Terminal Drawer */}
      <div className="relative z-10 w-full sm:w-[520px] h-full bg-[#090D16] border-l border-border-subtle flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Terminal Header */}
        <div className="p-4 border-b border-border-subtle flex items-center justify-between bg-surface/50">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-mono font-bold tracking-wider text-text-primary uppercase">
                Audit Trail Terminal
              </h3>
              <p className="text-[10px] font-mono text-text-muted">
                Immutable record: audit_events (Project: CampusConnect)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAuditEvents}
              disabled={isLoading}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              title="Refresh audit events"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={closeAuditDrawer}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Terminal Event List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 font-mono text-xs">
          {events.length === 0 ? (
            <div className="text-center py-12 text-text-muted text-xs">
              No audit events recorded yet.
            </div>
          ) : (
            events.map((event) => {
              const Icon = eventIconMap[event.event_type] || Terminal;
              const badgeStyle =
                eventBadgeColors[event.event_type] ||
                "bg-slate-800 text-slate-300 border-slate-700";
              const isExpanded = expandedEventId === event.id;

              return (
                <div
                  key={event.id}
                  className="rounded-lg bg-surface/40 border border-border-subtle p-3 hover:bg-surface/70 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${badgeStyle}`}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      {event.event_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-text-muted shrink-0">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-text-secondary">
                    <span>
                      Actor:{" "}
                      <strong className="text-text-primary font-medium">
                        {event.actor_name}
                      </strong>{" "}
                      ({event.actor_role})
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedEventId(isExpanded ? null : event.id)
                      }
                      className="text-[10px] text-accent-cyan hover:underline flex items-center gap-0.5"
                    >
                      <span>{isExpanded ? "Hide JSON" : "View JSON"}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <pre className="mt-2.5 p-2 rounded bg-black/60 border border-border-subtle text-[10px] text-accent-cyan/90 overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(event.details_json, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Terminal Footer */}
        <div className="p-3 border-t border-border-subtle bg-surface/30 text-[10px] font-mono text-text-muted flex items-center justify-between">
          <span>{events.length} audit entries loaded</span>
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Append-only verification active
          </span>
        </div>
      </div>
    </div>
  );
}
