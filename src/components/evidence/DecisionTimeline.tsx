"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  User,
  FileText,
  HelpCircle,
  Lock,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  Sparkles,
  GitBranch,
} from "lucide-react";
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
  const [expandedId, setExpandedId] = useState<string | null>("DT-02");

  const items = useMemo(() => {
    return propItems || getDecisionTimeline(audienceRole);
  }, [propItems, audienceRole]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedFilter === "decisions" && item.evidenceState === "stale")
        return false;
      if (selectedFilter === "attested" && item.evidenceState !== "attested")
        return false;
      if (selectedFilter === "conflicts" && item.evidenceState !== "conflicting")
        return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.summary.toLowerCase().includes(q) ||
        item.rationale.toLowerCase().includes(q) ||
        item.owner.toLowerCase().includes(q) ||
        item.sourceTitle.toLowerCase().includes(q)
      );
    });
  }, [items, selectedFilter, searchQuery]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getMarkerColor = (state: EvidenceState) => {
    switch (state) {
      case "corroborated":
        return "bg-emerald-500 border-emerald-200";
      case "single_source":
        return "bg-amber-500 border-amber-200";
      case "attested":
        return "bg-blue-500 border-blue-200";
      case "stale":
        return "bg-orange-500 border-orange-200";
      case "conflicting":
        return "bg-purple-500 border-purple-200";
      case "unsupported":
        return "bg-rose-500 border-rose-200";
      case "restricted":
        return "bg-slate-400 border-slate-200";
      default:
        return "bg-teal-600 border-teal-200";
    }
  };

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Header and Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 sm:p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <GitBranch className="w-4 h-4" />
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Project Decision Timeline
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 cursor-default select-none">
              {filteredItems.length} Milestones
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Chronological history showing key project choices, sources, and why decisions were made.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setSelectedFilter("all")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              selectedFilter === "all"
                ? "bg-teal-700 text-white border-teal-700 font-semibold"
                : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
            }`}
          >
            All ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("attested")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              selectedFilter === "attested"
                ? "bg-blue-700 text-white border-blue-700 font-semibold"
                : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
            }`}
          >
            Interview Answers
          </button>
          <button
            type="button"
            onClick={() => setSelectedFilter("conflicts")}
            className={`px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
              selectedFilter === "conflicts"
                ? "bg-purple-700 text-white border-purple-700 font-semibold"
                : "bg-white text-slate-700 hover:bg-slate-100 border-slate-300 font-medium"
            }`}
          >
            Conflicts
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search decisions, technologies (e.g. Redis, Next.js), or people..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 shadow-sm"
        />
      </div>

      {/* Vertical Timeline Tree */}
      <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {filteredItems.map((item) => {
          const isExpanded = expandedId === item.id;
          const isRestricted = item.isRestricted;

          return (
            <div
              key={item.id}
              className="relative"
              onClick={() => onSelectMilestone?.(item)}
            >
              {/* Marker Dot */}
              <div
                className={`absolute -left-6 sm:-left-8 top-4 w-6 h-6 rounded-full border-4 flex items-center justify-center shadow-sm ${getMarkerColor(
                  item.evidenceState
                )}`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>

              {/* Milestone Card */}
              <div
                className={`rounded-xl border transition-all ${
                  isRestricted
                    ? "bg-slate-100 border-slate-300 border-dashed"
                    : isExpanded
                    ? "bg-white border-teal-400 shadow-md"
                    : "bg-white border-slate-200 shadow-sm hover:border-slate-300"
                }`}
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 cursor-default select-none">
                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                        {item.timestamp}
                      </span>

                      {isRestricted && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 cursor-default select-none">
                          <Lock className="w-3 h-3" />
                          Restricted Role Scope
                        </span>
                      )}
                    </div>

                    <EvidenceBadge state={item.evidenceState} size="sm" />
                  </div>

                  <h3
                    className={`text-sm sm:text-base font-bold ${
                      isRestricted ? "text-slate-600 italic" : "text-slate-900"
                    }`}
                  >
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
                    {item.summary}
                  </p>

                  {/* Author / Source Meta Bar */}
                  <div className="flex flex-wrap items-center gap-3 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.owner}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-700">{item.sourceTitle}</span>
                    </span>

                    {!isRestricted && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(item.id);
                        }}
                        className="ml-auto inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 font-semibold cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {isExpanded ? "Hide 'Why' Rationale" : "Show 'Why' Rationale"}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Rationale */}
                {isExpanded && !isRestricted && (
                  <div className="px-4 sm:px-5 pb-5 pt-2 border-t border-slate-100 bg-slate-50/70 rounded-b-xl space-y-3.5">
                    <div className="p-3.5 rounded-lg bg-teal-50/70 border border-teal-200 space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-900">
                        <HelpCircle className="w-4 h-4 text-teal-700 shrink-0" />
                        <span>Why This Choice Was Made</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed pl-5">
                        {item.rationale}
                      </p>
                    </div>

                    {item.alternativesConsidered &&
                      item.alternativesConsidered.length > 0 && (
                        <div className="space-y-1.5 pl-1">
                          <span className="text-xs font-semibold text-slate-600 block">
                            Alternatives Considered:
                          </span>
                          <div className="space-y-1">
                            {item.alternativesConsidered.map((alt, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2 text-xs text-slate-700"
                              >
                                <span className="text-rose-600 font-semibold shrink-0">
                                  ✕
                                </span>
                                <span>{alt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200 gap-2">
                      <span>Source type: {item.sourceType.replace("_", " ")}</span>
                      <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Citation Verified
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="p-8 text-center rounded-xl bg-white border border-slate-200 text-slate-500 text-sm">
            No project decisions match your search or filter.
          </div>
        )}
      </div>
    </div>
  );
}
