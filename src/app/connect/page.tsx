"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Globe,
  Link2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StepGuideBanner } from "@/components/ui/StepGuideBanner";
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
  const [isResettingSeed, setIsResettingSeed] = useState(false);
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

  // Live URL Importer State (GitHub & Public Google Docs) — Expanded by default as headline feature
  const [isLiveImporterOpen, setIsLiveImporterOpen] = useState(true);
  const [githubUrl, setGithubUrl] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [isImportingGithub, setIsImportingGithub] = useState(false);
  const [googleDocUrl, setGoogleDocUrl] = useState("");
  const [isImportingDoc, setIsImportingDoc] = useState(false);
  const liveImportSectionRef = useRef<HTMLDivElement | null>(null);
  const githubInputRef = useRef<HTMLInputElement | null>(null);

  const fetchIngestionData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/ingest?projectId=CampusConnect", {
        cache: "no-store",
      });
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

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#live-import") {
      setIsLiveImporterOpen(true);
      setTimeout(() => {
        liveImportSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        githubInputRef.current?.focus();
      }, 150);
    }
  }, []);

  const handleJumpToLiveImporter = () => {
    setIsLiveImporterOpen(true);
    liveImportSectionRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setTimeout(() => {
      githubInputRef.current?.focus();
    }, 180);
  };

  const handleReloadSeed = async () => {
    try {
      setIsResettingSeed(true);
      setError(null);
      setSuccessBanner(null);

      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          projectId: "CampusConnect",
          useSeed: true,
          reset: true,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "Failed to reload baseline seed data");
      }

      await fetchIngestionData();
      setSuccessBanner(
        "Project sources, drafts, and handover receipts reset cleanly to CampusConnect baseline."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reload seed");
    } finally {
      setIsResettingSeed(false);
    }
  };

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

  const handleLiveImport = async (
    importType: "github" | "google_doc",
    url: string,
    token?: string
  ) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;

    const setBusy =
      importType === "github" ? setIsImportingGithub : setIsImportingDoc;

    try {
      setBusy(true);
      setError(null);
      setSuccessBanner(null);

      const res = await fetch("/api/live-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({
          type: importType,
          url: trimmedUrl,
          token: token?.trim() || undefined,
          projectId: "CampusConnect",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Live import failed");
      }

      if (importType === "github") {
        setGithubUrl("");
      } else {
        setGoogleDocUrl("");
      }

      setSuccessBanner(
        `${json.message || "Live content ingested and draft updated."} (${json.sourcesIngested ?? 1} source${json.sourcesIngested === 1 ? "" : "s"}, ${json.chunksCreated ?? 0} chunks indexed).`
      );
      await fetchIngestionData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import live URL");
    } finally {
      // Never retain optional access tokens in React state
      setGithubToken("");
      setBusy(false);
    }
  };

  const handleGitHubImport = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLiveImport("github", githubUrl, githubToken);
  };

  const handleGoogleDocImport = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleLiveImport("google_doc", googleDocUrl);
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
      <StepGuideBanner stepLabel="STEP 1 OF 4 • CONNECT SOURCES">
        EchoBridge scanned 8 project files and automatically hid 2 secrets. Review the file access permissions below, then click <strong>Generate Handover Draft →</strong>
      </StepGuideBanner>

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
            onClick={handleReloadSeed}
            isLoading={isResettingSeed}
          >
            Reload Seed
          </Button>

          <Button
            variant="secondary"
            onClick={handleJumpToLiveImporter}
            className="border-teal-300 bg-teal-50/70 text-teal-800 hover:bg-teal-100"
          >
            🔗 Import GitHub / Doc
          </Button>

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
      {/* 1B. ABOVE-THE-FOLD SPOTLIGHT: LIVE GITHUB & GOOGLE DOCS IMPORTER      */}
      {/* ==================================================================== */}
      <div
        id="live-import"
        ref={liveImportSectionRef}
        className="scroll-mt-24 rounded-2xl border-2 border-teal-300 bg-gradient-to-br from-teal-50/70 via-white to-white shadow-sm overflow-hidden"
      >
        <div className="px-4 sm:px-5 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-700 text-white text-[11px] font-bold uppercase tracking-wider">
              <Globe className="w-3 h-3 shrink-0" />
              <span>⚡ Live Import • No OAuth Needed</span>
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Import Live GitHub Repo or Public Google Doc
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Paste any repo or shared doc link — EchoBridge fetches live files, redacts secrets automatically, and updates your verified handover draft.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setIsLiveImporterOpen((prev) => !prev)}
            rightIcon={
              isLiveImporterOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )
            }
            className="shrink-0 self-start"
          >
            {isLiveImporterOpen ? "Hide Importer" : "Show Importer"}
          </Button>
        </div>

        {isLiveImporterOpen && (
          <div className="border-t border-teal-200/80 bg-white/60 p-4 sm:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Panel A: GitHub Repository Importer */}
            <form
              onSubmit={handleGitHubImport}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-teal-700 shrink-0" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      GitHub Repository
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setGithubUrl("https://github.com/shravan80800/echobridge");
                        githubInputRef.current?.focus();
                      }}
                      className="px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[11px] font-semibold text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
                    >
                      Try EchoBridge Repo
                    </button>
                    {(githubUrl || githubToken) && (
                      <button
                        type="button"
                        onClick={() => {
                          setGithubUrl("");
                          setGithubToken("");
                        }}
                        className="text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Repository URL
                  </label>
                  <input
                    ref={githubInputRef}
                    type="text"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repo"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Personal Access Token (Optional)
                  </label>
                  <input
                    type="password"
                    autoComplete="off"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="ghp_... (only needed for private repos)"
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Used only for this request and never stored or saved into handover notes.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isImportingGithub}
                disabled={isImportingDoc || !githubUrl.trim()}
                className="w-full"
              >
                {isImportingGithub ? "Importing Repo..." : "Connect GitHub Repo →"}
              </Button>
            </form>

            {/* Panel B: Public Google Doc Importer */}
            <form
              onSubmit={handleGoogleDocImport}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col justify-between space-y-3"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-teal-700 shrink-0" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Google Doc (Public Link)
                    </h3>
                  </div>
                  {googleDocUrl && (
                    <button
                      type="button"
                      onClick={() => setGoogleDocUrl("")}
                      className="text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Shared Document URL
                  </label>
                  <input
                    type="text"
                    value={googleDocUrl}
                    onChange={(e) => setGoogleDocUrl(e.target.value)}
                    placeholder="https://docs.google.com/document/d/..."
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    required
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    In Google Docs: Share → Anyone with the link → Viewer.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isImportingDoc}
                disabled={isImportingGithub || !googleDocUrl.trim()}
                className="w-full"
              >
                {isImportingDoc ? "Importing Doc..." : "Import Google Doc →"}
              </Button>
            </form>
          </div>
        )}
      </div>

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
