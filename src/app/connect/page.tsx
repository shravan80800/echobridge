"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  GitBranch,
  MessageSquare,
  Kanban,
  BookOpen,
  DollarSign,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { LoadingSkeleton, ErrorBanner } from "@/components/ui/StateViews";
import { RedactionQuarantineTable } from "@/components/review/RedactionQuarantineTable";
import type {
  QuarantinedSecret,
  Source,
  SourceType,
} from "@/types/echobridge.types";
import type { AclScopeItem } from "@/services/ingestion/parser.service";

const HUMAN_SOURCE_TITLES: Record<string, string> = {
  "SRC-ARCH-01": "Architecture Doc v2",
  "SRC-GIT-02": "GitHub PR #12 Export",
  "SRC-CHAT-03": "Team Chat Export (March)",
  "SRC-PLAN-04": "Event Planning Doc",
  "SRC-RUNBOOK-05": "Deployment Runbook",
  "SRC-FIN-06": "Finance & Sponsorship Folder",
  "SRC-BACKLOG-07": "Feature Backlog Notes",
  "SRC-TASK-08": "Sprint Task Board",
};

const SOURCE_SUBTITLES: Record<string, string> = {
  "SRC-ARCH-01": "Aarav Sharma • March 1, 2026",
  "SRC-GIT-02": "Aarav Sharma • March 2, 2026",
  "SRC-CHAT-03": "Team Slack • March 2, 2026",
  "SRC-PLAN-04": "Maya Patel & Aarav • March 3, 2026",
  "SRC-RUNBOOK-05": "DevOps Guide • Updated 9 months ago",
  "SRC-FIN-06": "Prof. Deshmukh • Confidential Budget",
  "SRC-BACKLOG-07": "Product Notes • March 5, 2026",
  "SRC-TASK-08": "Sprint Board • March 6, 2026",
};

export default function ConnectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [aclScopeMap, setAclScopeMap] = useState<AclScopeItem[]>([]);
  const [quarantinedSecrets, setQuarantinedSecrets] = useState<
    QuarantinedSecret[]
  >([]);
  const [showHiddenItems, setShowHiddenItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Add Source Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customType, setCustomType] = useState<SourceType>("document");
  const [customAuthor, setCustomAuthor] = useState("Aarav Sharma");
  const [customPath, setCustomPath] = useState("docs/custom_guide.md");
  const [customContent, setCustomContent] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const fetchIngestionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/ingest?projectId=CampusConnect");
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to load project sources");
      }

      setSources(json.sources || []);
      setAclScopeMap(json.aclScopeMap || []);
      setQuarantinedSecrets(json.quarantinedSecrets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching sources");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIngestionData();
  }, [fetchIngestionData]);

  const handleGenerateDraft = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      await fetch("/api/reconstruct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "CampusConnect",
          audienceRole: "both",
          showRestrictedPlaceholders: true,
        }),
      }).catch(() => null);

      router.push("/interview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate draft");
      setIsGenerating(false);
    }
  };

  const handleAddCustomSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim() || !customContent.trim()) {
      return;
    }

    try {
      setIsUploading(true);
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: "CampusConnect",
          sources: [
            {
              title: customTitle,
              source_type: customType,
              author: customAuthor,
              file_path: customPath,
              content: customContent,
            },
          ],
        }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to add source");
      }

      setIsModalOpen(false);
      setCustomTitle("");
      setCustomContent("");
      setSuccessBanner(
        "Source added and automatically scanned for sensitive items."
      );
      await fetchIngestionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload source");
    } finally {
      setIsUploading(false);
    }
  };

  const getSourceIcon = (type: SourceType) => {
    switch (type) {
      case "document":
        return <FileText className="w-5 h-5 text-teal-700 shrink-0" />;
      case "git_repo":
        return <GitBranch className="w-5 h-5 text-blue-600 shrink-0" />;
      case "chat_export":
        return <MessageSquare className="w-5 h-5 text-emerald-600 shrink-0" />;
      case "task_board":
        return <Kanban className="w-5 h-5 text-amber-600 shrink-0" />;
      case "runbook":
        return <BookOpen className="w-5 h-5 text-orange-600 shrink-0" />;
      case "finance_folder":
        return <DollarSign className="w-5 h-5 text-amber-700 shrink-0" />;
      default:
        return <FileText className="w-5 h-5 text-slate-500 shrink-0" />;
    }
  };

  const secretCount = quarantinedSecrets.filter(
    (s) => s.secret_type !== "prompt_injection"
  ).length;
  const injectionCount = quarantinedSecrets.filter(
    (s) => s.secret_type === "prompt_injection"
  ).length;

  const safetySummaryText =
    secretCount === 2 && injectionCount === 1
      ? "🛡️ Automatic Privacy Check Complete: 2 secrets (API key & phone number) were hidden and 1 unsafe instruction was removed before building the draft."
      : `🛡️ Automatic Privacy Check Complete: ${secretCount} sensitive item${
          secretCount === 1 ? "" : "s"
        } hidden and ${injectionCount} unsafe instruction${
          injectionCount === 1 ? "" : "s"
        } removed before building the draft.`;

  return (
    <main className="w-full space-y-6">
      {/* ==================================================================== */}
      {/* 1. ALIGNED PAGE HEADER                                               */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            1. Project Sources &amp; Access Scope
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Select which project files to include and verify who is allowed to see them.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="secondary"
            onClick={() => setIsModalOpen(true)}
          >
            ➕ Add Source
          </Button>

          <Button
            variant="primary"
            onClick={handleGenerateDraft}
            isLoading={isGenerating}
          >
            {isGenerating ? "Building Draft..." : "Generate Handover Draft →"}
          </Button>
        </div>
      </div>

      {/* Feedback / Error Banners */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 hover:text-emerald-900 font-semibold text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {error && <ErrorBanner message={error} onRetry={fetchIngestionData} />}

      {/* ==================================================================== */}
      {/* 2. PLAIN-ENGLISH PRIVACY & SAFETY SUMMARY STRIP                      */}
      {/* ==================================================================== */}
      <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-sm text-slate-800 leading-relaxed">
          {safetySummaryText}
        </p>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowHiddenItems((prev) => !prev)}
          className="shrink-0 self-start sm:self-center"
        >
          {showHiddenItems
            ? `Hide Hidden Items (${quarantinedSecrets.length})`
            : `View Hidden Items (${quarantinedSecrets.length})`}
        </Button>
      </div>

      {/* Collapsible Quarantine Table */}
      {showHiddenItems && (
        <RedactionQuarantineTable secrets={quarantinedSecrets} />
      )}

      {/* ==================================================================== */}
      {/* 3. CLEAN, MOBILE-FRIENDLY SOURCE LIST                                */}
      {/* ==================================================================== */}
      {loading ? (
        <LoadingSkeleton
          cardCount={3}
          message="Scanning project files and access permissions..."
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Connected Project Files ({sources.length})
            </span>
            <span className="text-xs text-slate-500">
              Access checked before draft generation
            </span>
          </div>

          <div className="divide-y divide-slate-200">
            {sources.map((src) => {
              const scope = aclScopeMap.find((s) => s.sourceId === src.id);
              const isRestrictedFromIntern =
                scope?.isRestrictedFromIntern ||
                src.source_type === "finance_folder" ||
                src.file_path?.includes("Finance");

              const displayName = HUMAN_SOURCE_TITLES[src.id] || src.title;
              const subtitle =
                SOURCE_SUBTITLES[src.id] ||
                `By ${src.author} • ${
                  src.source_timestamp
                    ? new Date(src.source_timestamp).toLocaleDateString()
                    : "Recent"
                }`;

              return (
                <div
                  key={src.id}
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isRestrictedFromIntern ? "bg-amber-50/30" : "bg-white"
                  }`}
                >
                  {/* Left: Icon + Human-Readable Name & Metadata */}
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 shrink-0">
                      {getSourceIcon(src.source_type)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-sm font-semibold text-slate-900 block truncate">
                        {displayName}
                      </span>
                      <span className="text-xs text-slate-500 block mt-0.5">
                        {subtitle}
                      </span>
                    </div>
                  </div>

                  {/* Right: Flat Non-Clickable Access Status Pills */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 pl-12 sm:pl-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default select-none">
                      Team Lead: Allowed
                    </span>

                    {isRestrictedFromIntern ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 cursor-default select-none">
                        <Lock className="w-3 h-3 shrink-0" />
                        <span>Intern: Restricted</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 cursor-default select-none">
                        Intern: Allowed
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="flex justify-end pt-2">
        <Button
          variant="primary"
          onClick={handleGenerateDraft}
          isLoading={isGenerating}
          className="w-full sm:w-auto"
        >
          {isGenerating ? "Building Draft..." : "Generate Handover Draft →"}
        </Button>
      </div>

      {/* Add Source Modal (Clean Light Mode) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Project Source"
        description="Paste project documentation, notes, or chat text. EchoBridge will scan it for secrets before including it."
      >
        <form onSubmit={handleAddCustomSource} className="space-y-4 text-sm">
          <div>
            <label className="block text-slate-800 font-medium mb-1">
              Source Title
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="e.g. Production Infrastructure Notes"
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-800 font-medium mb-1">
                Source Type
              </label>
              <select
                value={customType}
                onChange={(e) => setCustomType(e.target.value as SourceType)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              >
                <option value="document">Document</option>
                <option value="chat_export">Chat Export</option>
                <option value="git_repo">Git Pull Request</option>
                <option value="runbook">Runbook</option>
                <option value="task_board">Task Board</option>
                <option value="finance_folder">
                  Finance Folder (Restricted)
                </option>
              </select>
            </div>

            <div>
              <label className="block text-slate-800 font-medium mb-1">
                Author
              </label>
              <input
                type="text"
                value={customAuthor}
                onChange={(e) => setCustomAuthor(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-800 font-medium mb-1">
              Folder / Path
            </label>
            <input
              type="text"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              placeholder="e.g. docs/infrastructure.md"
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-800 font-medium mb-1">
              Source Content
            </label>
            <textarea
              rows={5}
              value={customContent}
              onChange={(e) => setCustomContent(e.target.value)}
              placeholder="Paste markdown, notes, or chat text here..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
              required
            />
          </div>

          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isUploading}>
              Add &amp; Scan Source
            </Button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
