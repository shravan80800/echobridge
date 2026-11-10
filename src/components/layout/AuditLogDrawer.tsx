"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  History,
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
  secret_quarantined: "bg-amber-50 text-amber-800 border-amber-200",
  injection_flagged: "bg-rose-50 text-rose-800 border-rose-200",
  access_denied_guard: "bg-rose-50 text-rose-800 border-rose-200",
  handover_approved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  role_switched: "bg-blue-50 text-blue-800 border-blue-200",
  draft_generated: "bg-teal-50 text-teal-800 border-teal-200",
  gap_answered: "bg-blue-50 text-blue-800 border-blue-200",
};

export function AuditLogDrawer() {
  const {
    isAuditDrawerOpen,
    closeAuditDrawer,
    activeProjectId,
    activeProjectName,
  } = useRole();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const fetchAuditEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/audit?projectId=${encodeURIComponent(activeProjectId)}&limit=50`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.events)) {
        setEvents(data.events);
      }
    } catch {
      // Ignore network hiccup in drawer
    } finally {
      setIsLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    if (isAuditDrawerOpen) {
      fetchAuditEvents();
    }
  }, [isAuditDrawerOpen, fetchAuditEvents]);

  if (!isAuditDrawerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Activity Log"
      className="fixed inset-0 z-50 flex justify-end"
    >
      {/* Light Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/30 backdrop-blur-[1px] transition-opacity"
        onClick={closeAuditDrawer}
      />

      {/* Light Mode Slide-Over Drawer */}
      <div className="relative z-10 w-full sm:w-[460px] h-full bg-white border-l border-slate-200 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Activity Log
              </h3>
              <p className="text-xs text-slate-500">
                Recorded actions for Project: {activeProjectName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={fetchAuditEvents}
              disabled={isLoading}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Refresh activity log"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </button>
            <button
              type="button"
              onClick={closeAuditDrawer}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 transition-colors cursor-pointer"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Event List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-slate-50/50">
          {events.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No activity events recorded yet.
            </div>
          ) : (
            events.map((event) => {
              const Icon = eventIconMap[event.event_type] || History;
              const badgeStyle =
                eventBadgeColors[event.event_type] ||
                "bg-slate-100 text-slate-700 border-slate-300";
              const isExpanded = expandedEventId === event.id;

              return (
                <div
                  key={event.id}
                  className="rounded-lg bg-white border border-slate-200 p-3.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border cursor-default select-none capitalize ${badgeStyle}`}
                    >
                      <Icon className="w-3 h-3 shrink-0" />
                      {event.event_type.replace(/_/g, " ")}
                    </span>
                    <span className="text-xs text-slate-500 shrink-0">
                      {new Date(event.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      By{" "}
                      <strong className="text-slate-900 font-semibold">
                        {event.actor_name}
                      </strong>
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        setExpandedEventId(isExpanded ? null : event.id)
                      }
                      className="text-xs font-medium text-teal-700 hover:text-teal-800 inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <span>{isExpanded ? "Hide details" : "Details"}</span>
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {isExpanded && (
                    <pre className="mt-2.5 p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700 overflow-x-auto whitespace-pre-wrap break-all">
                      {JSON.stringify(event.details_json, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white text-xs text-slate-500 flex items-center justify-between">
          <span>{events.length} recorded events</span>
          <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Append-only log active
          </span>
        </div>
      </div>
    </div>
  );
}
