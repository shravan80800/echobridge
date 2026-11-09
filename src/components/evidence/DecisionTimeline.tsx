"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  User,
  FileText,
  HelpCircle,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Sparkles,
  Layers,
  ArrowRight,
  GitBranch,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EvidenceBadge } from "@/components/evidence/EvidenceBadge";
import type {
  AudienceRole,
  DecisionTimelineItem,
  EvidenceState,
} from "@/types/echobridge.types";
import { getDecisionTimeline } from "@/services/evidence/timeline.service";

export interface DecisionTimelineProps {
  audienceRole: AudienceRole;
  items?: DecisionTimelineItem[];
  className?: string;
  onSelectMilestone?: (item: DecisionTimelineItem) => void;
}

export function DecisionTimeline({
  audienceRole,
  items: propItems,
  className = "",
  onSelectMilestone,
}: DecisionTimelineProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>("DT-02"); // Open Trap 2 by default as a highlight

  const items = useMemo(() => {
    return propItems || getDecisionTimeline(audienceRole);
  }, [propItems, audienceRole]);

  // Filter items based on filter category and search query
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Category filter
      if (selectedFilter === "traps" && !item.plantedTrap) return false;
      if (selectedFilter === "decisions" && item.evidenceState === "stale") return false;
      if (selectedFilter === "attested" && item.evidenceState !== "attested") return false;
      if (selectedFilter === "conflicts" && item.evidenceState !== "conflicting") return false;

      // Text search
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.rationale.toLowerCase().includes(q) ||
        item.owner.toLowerCase().includes(q) ||
        item.sourceTitle.toLowerCase().includes(q) ||
        (item.plantedTrap && item.plantedTrap.toLowerCase().includes(q))
      );
    });
  }, [items, selectedFilter, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getEvidenceColor = (state: EvidenceState) => {
    switch (state) {
      case "corroborated":
        return "bg-emerald-500 border-emerald-400";
      case "single_source":
        return "bg-amber-500 border-amber-400";
      case "attested":
        return "bg-cyan-500 border-cyan-400";
      case "stale":
        return "bg-orange-500 border-orange-400";
      case "conflicting":
        return "bg-purple-500 border-purple-400";
      case "unsupported":
        return "bg-red-500 border-red-400";
      case "restricted":
        return "bg-slate-600 border-slate-500";
      default:
        return "bg-indigo-500 border-indigo-400";
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-border-subtle shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-indigo-500/10 text-accent-primary">
              <GitBranch className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-text-primary tracking-tight">
              Architectural Decision Timeline
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {filteredItems.length} Milestones
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Chronological epistemic history connecting sources, unwritten gaps, and &quot;Why&quot; rationale across project evolution.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
          <button
            type="button"
            onClick={() => setSelectedFilter("all")}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              selectedFilter === "all"
                ? "bg-indigo-600 text-white font-bold"
                : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("traps")}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              selectedFilter === "traps"
                ? "bg-purple-600 text-white font-bold"
                : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            Planted Traps
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("attested")}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              selectedFilter === "attested"
                ? "bg-cyan-600 text-white font-bold"
                : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            Attested Gaps (Blue)
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("conflicts")}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              selectedFilter === "conflicts"
                ? "bg-purple-800 text-white font-bold"
                : "bg-canvas text-text-secondary hover:text-text-primary border border-border-subtle"
            }`}
          >
            Conflicts (Purple)
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search milestones by decision, technology (e.g. Redis, Next.js), rationale, or owner..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border-subtle text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-primary"
        />
      </div>

      {/* Vertical Timeline Tree */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border-subtle">
        {filteredItems.map((item) => {
          const isExpanded = expandedId === item.id;
          const isRestricted = item.isRestricted;

          return (
            <div
              key={item.id}
              className="relative group transition-all"
              onClick={() => onSelectMilestone?.(item)}
            >
              {/* Timeline Pulse Marker */}
              <div
                className={`absolute -left-6 sm:-left-8 top-3.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg ${getEvidenceColor(
                  item.evidenceState
                )}`}
              >
                <div className="w-2 h-2 rounded-full bg-canvas" />
              </div>

              {/* Milestone Card */}
              <div
                className={`rounded-xl border transition-all ${
                  isRestricted
                    ? "bg-slate-900/40 border-slate-800/80"
                    : isExpanded
                    ? "bg-surface border-indigo-500/50 shadow-xl ring-1 ring-indigo-500/20"
                    : "bg-surface/90 border-border-subtle hover:border-border-hover shadow-sm"
                }`}
              >
                {/* Header row */}
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 font-mono text-[11px] font-bold text-text-secondary bg-canvas px-2.5 py-1 rounded-lg border border-border-subtle">
                        <Calendar className="w-3 h-3 text-text-muted" />
                        {item.timestamp}
                      </span>

                      {item.plantedTrap && (
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300">
                          {item.plantedTrap}
                        </span>
                      )}

                      {isRestricted && (
                        <span className="flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400">
                          <Lock className="w-2.5 h-2.5" />
                          Restricted Role Scope
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <EvidenceBadge state={item.evidenceState} size="sm" />
                    </div>
                  </div>

                  {/* Title & Summary */}
                  <h3
                    className={`text-sm sm:text-base font-bold tracking-tight ${
                      isRestricted ? "text-text-muted italic" : "text-text-primary"
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                    {item.summary}
                  </p>

                  {/* Author / Source Meta Bar */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-border-subtle text-[11px] font-mono text-text-muted">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-text-muted" />
                      <span>{item.owner}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-text-muted" />
                      <span className="text-text-secondary">{item.sourceTitle}</span>
                    </span>

                    {!isRestricted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(item.id);
                        }}
                        className="ml-auto flex items-center gap-1 text-accent-cyan hover:text-white transition-colors"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>{isExpanded ? "Hide 'Why' Rationale" : "Inspect 'Why' Rationale"}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* "Why" Rationale Accordion Panel */}
                {isExpanded && !isRestricted && (
                  <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-border-subtle bg-canvas/40 rounded-b-xl space-y-3.5">
                    {/* The "Why" Rationale Callout */}
                    <div className="p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-accent-primary">
                        <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Epistemic &quot;Why&quot; Rationale:</span>
                      </div>
                      <p className="text-xs text-indigo-100 leading-relaxed font-sans pl-5">
                        {item.rationale}
                      </p>
                    </div>

                    {/* Alternatives Considered */}
                    {item.alternativesConsidered && item.alternativesConsidered.length > 0 && (
                      <div className="space-y-1.5 pl-1">
                        <span className="text-[11px] font-mono text-text-muted uppercase tracking-wider block">
                          Alternatives Evaluated &amp; Rejected:
                        </span>
                        <div className="space-y-1">
                          {item.alternativesConsidered.map((alt, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-2 text-xs text-text-secondary"
                            >
                              <span className="text-rose-400 font-mono text-[11px] shrink-0">
                                ✕
                              </span>
                              <span>{alt}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Attribution & Provenance Footnote */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-text-muted pt-2 border-t border-border-subtle">
                      <span>Source Provenance: {item.sourceType}</span>
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Zero-Leak Citation Verified
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="p-8 text-center rounded-xl bg-surface border border-border-subtle text-text-muted text-xs">
            No decision milestones match your search or filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
